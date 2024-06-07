import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface S3Artifact {
    /**
     * The bucket.
     */
    readonly bucket: aws.s3.Bucket;

    /**
     * The path inside the bucket where the artifact is located.
     * Must start with a slash, and end without a slash.
     * Example: "/frontend/abcd1234"
     */
    readonly path: string;

    requestCloudfrontReadAccess(distributionArn: pulumi.Output<string>): void;

}

export function getS3Artifact(bucket: aws.s3.Bucket, path: string): S3Artifact {
    return {
        bucket,
        path,
        requestCloudfrontReadAccess: () => {}
    };
}
