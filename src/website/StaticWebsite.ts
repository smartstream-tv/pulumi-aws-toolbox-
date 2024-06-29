import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ComponentResource, ComponentResourceOptions } from "@pulumi/pulumi";
import { S3Artifact } from "../build/S3Artifact";
import { CloudfrontChainedFunction } from "./CloudfrontChainedFunction";

/**
 * Optionionated way of building a static website using CloudFront and S3.
 * 
 * Primarily, assets are loaded from an assets bucket. This bucket must be provided by you. Useful if
 *  - the bucket should be shared by several dev stacks and must therefore already exist during the CI build phase.
 *  - additional settings/permissions should configured for the bucket (like cross-account access from prod)
 */
export class StaticWebsite extends ComponentResource {
    readonly name: string;
    readonly domain: pulumi.Output<string>;

    private args: WebsiteArgs;
    private distribution: aws.cloudfront.Distribution;

    constructor(name: string, args: WebsiteArgs, opts?: ComponentResourceOptions) {
        super("pat:website:StaticWebsite", name, args, opts);
        this.args = args;
        this.name = name;

        const zone = aws.route53.Zone.get("zone", args.hostedZoneId);
        this.domain = args.subDomain ? pulumi.interpolate`${args.subDomain}.${zone.name}` : zone.name;

        const basicAuthEnabled = args.basicAuth != null;
        const viewerRequestFunc = new CloudfrontChainedFunction(`${name}-viewer-request`, {
            eventType: "viewer-request",
            handlerChain: [
                ...(basicAuthEnabled ? [{
                    name: "basicAuthHandler",
                    replacements: {
                        "__BASIC_AUTH__": Buffer.from(`${args.basicAuth?.username}:${args.basicAuth?.password}`).toString('base64'),
                    }
                }] : []),
                {
                    name: "indexRewriteHandler",
                },
            ],
        }, { parent: this });

        const immutableResponseFunc = new CloudfrontChainedFunction(`${name}-immutable-response`, {
            eventType: "viewer-response",
            handlerChain: [{
                name: "cacheControlHandler",
                replacements: { "__IMMUTABLE__": "true" },
            }],
        }, { parent: this });

        const mutableResponseFunc = new CloudfrontChainedFunction(`${name}-mutable-response`, {
            eventType: "viewer-response",
            handlerChain: [{
                name: "cacheControlHandler",
                replacements: { "__IMMUTABLE__": "false" },
            }],
        }, { parent: this });

        function stdCacheBehavior() {
            return {
                allowedMethods: ["HEAD", "GET"],
                cachedMethods: ["HEAD", "GET"],
                viewerProtocolPolicy: "redirect-to-https",
                minTtl: 60,
                defaultTtl: 60,
                maxTtl: 60,
                forwardedValues: {
                    cookies: {
                        forward: "none",
                    },
                    headers: [],
                    queryString: false,
                },
                compress: true,
            };
        }

        const oac = new aws.cloudfront.OriginAccessControl(name, {
            originAccessControlOriginType: "s3",
            signingBehavior: "always",
            signingProtocol: "sigv4",
        }, { parent: this });

        const assetsOriginId = "assets";

        const immutableCacheBehaviors = (args.immutablePaths ? args.immutablePaths : []).map(pathPattern => ({
            ...stdCacheBehavior(),
            pathPattern,
            targetOriginId: assetsOriginId,
            functionAssociations: [viewerRequestFunc.toAssociation(), immutableResponseFunc.toAssociation()],
        }));

        // aux bucket
        const auxBucket = new aws.s3.Bucket(`${name}-aux`, {}, { parent: this });
        const auxBucketPublicAccess = new aws.s3.BucketPublicAccessBlock(`${name}-aux`, {
            bucket: auxBucket.id,
            blockPublicAcls: true,
            ignorePublicAcls: true,
        }, { parent: this });
        const integrations = args.integrations || [];

        this.distribution = new aws.cloudfront.Distribution(name, {
            origins: [
                {
                    originId: assetsOriginId,
                    domainName: args.assets.bucket.bucketRegionalDomainName,
                    originAccessControlId: oac.id,
                    originPath: '/' + args.assets.path,
                },
                ...(integrations.map((integration, index) => {
                    switch (integration.type) {
                        case "SingleAssetIntegration":
                            new aws.s3.BucketObject(`${name}-${integration.path}`, {
                                bucket: auxBucket,
                                key: `single-asset${integration.path}`,
                                content: integration.content,
                                contentType: integration.contentType
                            });
                            return {
                                originId: `integration-${index}`,
                                domainName: auxBucket.bucketRegionalDomainName,
                                originAccessControlId: oac.id,
                                originPath: `/single-asset`,
                            };
                    }
                    throw new Error(`Unsupported integration ${integration.type}`);
                }))
            ],
            originGroups: [],
            enabled: true,
            isIpv6Enabled: true,
            comment: `${name}`,
            aliases: [this.domain],
            defaultRootObject: "index.html",
            defaultCacheBehavior: {
                ...stdCacheBehavior(),
                targetOriginId: assetsOriginId,
                functionAssociations: [viewerRequestFunc.toAssociation(), mutableResponseFunc.toAssociation()],
            },
            orderedCacheBehaviors: [
                ...(integrations.map((integration, index) => {
                    switch (integration.type) {
                        case "SingleAssetIntegration":
                            return {
                                ...stdCacheBehavior(),
                                pathPattern: integration.path,
                                targetOriginId: `integration-${index}`,
                                functionAssociations: [viewerRequestFunc.toAssociation(), mutableResponseFunc.toAssociation()],
                            };
                    }
                    throw new Error(`Unsupported integration ${integration.type}`);
                })),
                ...immutableCacheBehaviors
            ],
            priceClass: "PriceClass_100",
            restrictions: {
                geoRestriction: {
                    restrictionType: "none"
                },
            },
            viewerCertificate: {
                acmCertificateArn: args.acmCertificateArn_usEast1,
                minimumProtocolVersion: "TLSv1.2_2021",
                sslSupportMethod: "sni-only"
            },
            customErrorResponses: [
                {
                    errorCode: 404,
                    responseCode: 404,
                    responsePagePath: "/404.html",
                },
            ]
        }, { parent: this });

        // read access to assets bucket
        this.args.assets.requestCloudfrontReadAccess(this.distribution.arn);

        // read access to aux bucket
        new aws.s3.BucketPolicy(this.name, {
            bucket: auxBucket.id,
            policy: aws.iam.getPolicyDocumentOutput({
                statements: [{
                    sid: `CloudFront-Read`,
                    principals: [{
                        type: "Service",
                        identifiers: ["cloudfront.amazonaws.com"],
                    }],
                    actions: [
                        "s3:GetObject",
                        "s3:ListBucket",
                    ],
                    resources: [
                        pulumi.interpolate`${auxBucket.arn}`,
                        pulumi.interpolate`${auxBucket.arn}/*`,
                    ],
                    conditions: [
                        {
                            test: "StringEquals",
                            variable: "AWS:SourceArn",
                            values: [this.distribution.arn],
                        }
                    ],
                }],
            }).json,
        }, {
            parent: this,
            dependsOn: [auxBucketPublicAccess]
        });

        // DNS records
        const cloudfrontZoneId = "Z2FDTNDATAQYW2";
        new aws.route53.Record(`${name}-a`, {
            zoneId: zone.zoneId,
            name: args.subDomain || "",
            type: "A",
            aliases: [{
                zoneId: cloudfrontZoneId,
                name: this.distribution.domainName,
                evaluateTargetHealth: false
            }]
        }, { parent: this });
        new aws.route53.Record(`${name}-aaaa`, {
            zoneId: zone.zoneId,
            name: args.subDomain || "",
            type: "AAAA",
            aliases: [{
                zoneId: cloudfrontZoneId,
                name: this.distribution.domainName,
                evaluateTargetHealth: false
            }]
        }, { parent: this });
    }
}


export interface WebsiteArgs {
    /**
     * ARN of the HTTPS certificate. The ACM certificate must be created in the us-east-1 region!
     */
    readonly acmCertificateArn_usEast1: string;

    /**
     * A S3 bucket location with the default assets that should be delivered.
     * 
     * You must make sure the bucket as a resource policy that allows read access from CloudFront.
     * If you're using S3ArtifactStore, this can be achieved by calling it's createBucketPolicy method.
     */
    readonly assets: S3Artifact;

    /**
     * Integrates additional assets using CloudFront cache behaviours.
     */
    readonly integrations?: (SingleAssetIntegration | BucketIntegration | ApiIntegration)[];

    /**
     * Optionally, protects the website with HTTP basic auth.
     */
    readonly basicAuth?: BasicAuthArgs;

    /**
     * Path patterns that should be treated as immutable.
     * Example: "/_astro/*"
     */
    readonly immutablePaths?: string[];

    readonly hostedZoneId: string;

    /**
     * The subdomain within the hosted zone or null if the zone apex should be used.
     */
    readonly subDomain?: string;
}

export type SingleAssetIntegration = {
    readonly type: "SingleAssetIntegration";
    /**
     * Must start with a slash.
     */
    readonly path: string;
    readonly content: string | pulumi.Output<string>;
    readonly contentType: string;
}

export type BucketIntegration = {
    readonly type: "BucketIntegration";
    readonly pathPattern: string;
    readonly artifact: S3Artifact;
    readonly immutable: boolean;
}

export type ApiIntegration = {
    readonly type: "ApiIntegration";
    readonly pathPattern: string;
    readonly originDomain: pulumi.Output<string>;
}

export interface BasicAuthArgs {
    readonly username: string;
    readonly password: string;
}