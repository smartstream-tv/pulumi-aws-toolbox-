import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ComponentResource, ComponentResourceOptions } from "@pulumi/pulumi";
import { getAccountId } from "../util/aws";
import { S3Artifact } from "./S3Artifact";


/**
 * An abstraction that can be used to store build artifacts in S3.
 */
export class S3ArtifactStore extends ComponentResource {
    private args: S3ArtifactStoreArgs;
    private bucket: aws.s3.Bucket;
    private name: string;
    private publicAccess: aws.s3.BucketPublicAccessBlock;
    private readAccessRequests: ReadAccessRequest[];

    constructor(name: string, args: S3ArtifactStoreArgs, opts?: ComponentResourceOptions) {
        super("pat:build:S3ArtifactStore", name, args, opts);
        this.args = args;
        this.name = name;
        this.readAccessRequests = [];

        this.bucket = new aws.s3.Bucket(name, {
            bucket: `${name}-${getAccountId()}`,
            versioning: {
                enabled: true
            },
            lifecycleRules: [
                {
                    id: "delete_old_versions",
                    enabled: args.expirationDays != undefined,
                    noncurrentVersionExpiration: {
                        days: args.expirationDays,
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

        this.publicAccess = new aws.s3.BucketPublicAccessBlock(name, {
            bucket: this.bucket.id,
            blockPublicAcls: true,
            ignorePublicAcls: true,
        }, { parent: this });
    }

    getArtifactVersion(version: string): S3Artifact {
        const path = `/${this.args.artifactName}/${version}`;
        return {
            bucket: this.bucket,
            path,
            requestCloudfrontReadAccess: (distributionArn: pulumi.Output<string>) => {
                this.readAccessRequests.push({ distributionArn, path });
            },
        };
    }

    /**
     * Creates a bucket resource policy that allows CloudFront to read the artifacts.
     */
    createBucketPolicy() {
        new aws.s3.BucketPolicy(this.name, {
            bucket: this.bucket.id,
            policy: aws.iam.getPolicyDocumentOutput({
                statements: this.readAccessRequests.map(request => ({
                    sid: `CloudFront-Read-${request.path}`,
                    principals: [{
                        type: "Service",
                        identifiers: ["cloudfront.amazonaws.com"],
                    }],
                    actions: [
                        "s3:GetObject",
                        "s3:ListBucket",
                    ],
                    resources: [
                        pulumi.interpolate`${this.bucket.arn}`,
                        pulumi.interpolate`${this.bucket.arn}${request.path}/*`,
                    ],
                    conditions: [
                        {
                            test: "StringEquals",
                            variable: "AWS:SourceArn",
                            values: [request.distributionArn],
                        }
                    ],
                })),
            }).json,
        }, {
            parent: this,
            dependsOn: [this.publicAccess]
        });
    }
}

export interface S3ArtifactStoreArgs {
    readonly artifactName: string;
    readonly expirationDays?: number;
}

interface ReadAccessRequest {
    distributionArn: pulumi.Output<string>
    path: string;
}
