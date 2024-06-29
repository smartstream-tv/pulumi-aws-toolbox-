import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface S3Artifact {
    /**
     * The bucket.
     */
    readonly bucket: aws.s3.Bucket;

    /**
     * The path inside the bucket where the artifact is located.
     * Must start without a slash, and end without a slash.
     * Example: "frontend/abcd1234"
     */
    readonly path: string;

    /**
     * The component using this artifact (e.g. AWS Lambda / CloudFront) needs read access to the artifact, which they can request by calling this method.
     */
    requestCloudfrontReadAccess(distributionArn: pulumi.Output<string>): void;

}

/**
 * Returns a S3 artifact for an existing bucket.
 * The bucket may have been manually created to share artifacts across stacks.
 * The bucket must already allow proper read access.
 */
export function getS3ArtifactForBucket(bucket: aws.s3.Bucket, artifactName: string, version: string): S3Artifact {
    return {
        bucket,
        path: `${artifactName}/${version}`,
        requestCloudfrontReadAccess: () => {
            // ignored - not supported
        }
    };
}
