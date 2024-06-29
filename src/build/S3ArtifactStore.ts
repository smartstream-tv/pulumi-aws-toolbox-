import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ComponentResource, ComponentResourceOptions } from "@pulumi/pulumi";
import { getAccountId } from "../util/aws";
import { S3Artifact } from "./S3Artifact";


/**
 * Creates a S3 bucket where build artifacts can be stored.
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
                    id: "noncurrentVersionExpiration",
                    enabled: true,
                    noncurrentVersionExpiration: {
                        days: 30,
                    },
                },
                ...(args.expirationDays != undefined ? [{
                    id: "expiration",
                    enabled: true,
                    expiration: {
                        days: args.expirationDays,
                        expiredObjectDeleteMarker: true,
                    }
                }] : [])
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

    /**
     * Returns a S3Artifact object for the given version that links to the storage location in S3.
     * The referenced artifact may not exist yet at the storage location.
     */
    getArtifactVersion(version: string): S3Artifact {
        const path = `${this.args.artifactName}/${version}`;
        return {
            bucket: this.bucket,
            path,
            requestCloudfrontReadAccess: (distributionArn: pulumi.Output<string>) => {
                this.readAccessRequests.push({ distributionArn, path });
            },
        };
    }

    /**
     * Creates a bucket resource policy based on the received read requests.
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
                        pulumi.interpolate`${this.bucket.arn}/${request.path}/*`,
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
