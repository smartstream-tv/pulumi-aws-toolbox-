import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ComponentResource, ComponentResourceOptions } from "@pulumi/pulumi";
import { getAccountId } from "../util/aws";
import { CloudfrontChainedFunction } from "./CloudfrontChainedFunction";

/**
 * Optionionated way of building a static website using CloudFront and S3.
 */
export class StaticWebsite extends ComponentResource {
    readonly assetsBucketName: pulumi.Output<string>;
    readonly name: string;
    readonly domain: pulumi.Output<string>;

    private args: WebsiteArgs;
    private distribution: aws.cloudfront.Distribution;

    constructor(name: string, args: WebsiteArgs, opts?: ComponentResourceOptions) {
        super("pat:StaticWebsite", name, args, opts);
        this.args = args;
        this.name = name;

        if (!args.assetsPath.startsWith('/') || args.assetsPath.endsWith('/')) {
            throw new Error(`Illegal assetsPath`);
        }

        const assetsBucket = args.assetsBucket || this.createAssetsBucket();
        this.assetsBucketName = assetsBucket.bucket;

        const assetsBucketPublicAccess = args.assetsBucket ? null : new aws.s3.BucketPublicAccessBlock(`${this.name}`, {
            bucket: assetsBucket.id,
            blockPublicAcls: true,
            ignorePublicAcls: true,
        }, { parent: this });

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

        this.distribution = new aws.cloudfront.Distribution(name, {
            origins: [{
                originId: assetsOriginId,
                domainName: assetsBucket.bucketRegionalDomainName,
                originAccessControlId: oac.id,
                originPath: args.assetsPath,
            }],
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

        // grant access to assets
        if (args.assetsBucket == null) {
            new aws.s3.BucketPolicy(`${name}`, {
                bucket: assetsBucket.id,
                policy: aws.iam.getPolicyDocumentOutput({
                    statements: [
                        this.createBucketReadPolicyStatement(assetsBucket.bucket)
                    ],
                }).json,
            }, {
                parent: this,
                dependsOn: [assetsBucketPublicAccess!]
            });
        }

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

    private createAssetsBucket() {
        const bucket = new aws.s3.Bucket(`${this.name}`, {
            bucket: `${this.name}-${getAccountId()}`,
            versioning: {
                enabled: true
            },
            lifecycleRules: [
                {
                    id: "delete_old_versions",
                    enabled: true,
                    noncurrentVersionExpiration: {
                        days: 90,
                    }
                }
            ],
            serverSideEncryptionConfiguration: {
                rule: {
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: "AES256",
                    },
                }
            },
        }, { parent: this });

        return bucket;
    }

    /**
     * Generates an IAM policy statement that allows CloudFront to read the assets from the assets bucket.
     */
    createBucketReadPolicyStatement(bucketName: pulumi.Output<string>) {
        return {
            sid: `CloudFront-Read-${this.args.assetsPath}`,
            principals: [{
                type: "Service",
                identifiers: ["cloudfront.amazonaws.com"],
            }],
            actions: [
                "s3:GetObject",
                "s3:ListBucket",
            ],
            resources: [
                pulumi.interpolate`arn:aws:s3:::${bucketName}`,
                pulumi.interpolate`arn:aws:s3:::${bucketName}${this.args.assetsPath}/*`,
            ],
            conditions: [
                {
                    test: "StringEquals",
                    variable: "AWS:SourceArn",
                    values: [this.distribution.arn],
                }
            ],
        };
    }

}


export interface WebsiteArgs {
    /**
     * ARN of the HTTPS certificate. The ACM certificate must be created in the us-east-1 region!
     */
    readonly acmCertificateArn_usEast1: string;

    /**
     * Optionally, overwrite the bucket to be used for assets.
     * Useful if
     *  - the bucket should be shared by several dev stacks and must therefore already exist during the CI build phase.
     *  - additional settings/permissions should configured for the bucket (like cross-account access from prod)
     * 
     * If this is specified you must make sure the bucket as a resource policy that allows read access from CloudFront (you can use createBucketReadPolicyStatement).
     */
    readonly assetsBucket?: aws.s3.Bucket;

    /**
     * The path inside the assets bucket from where the website's static files should be loaded from.
     * Must start with a slash, end without a slash.
     * 
     * Usually this is a path where the CI has deployed the frontend assets to.
     * Example: "/frontend/abcd1234"
     */
    readonly assetsPath: string;

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

    readonly subDomain?: string;
}

export interface BasicAuthArgs {
    readonly username: string;
    readonly password: string;
}