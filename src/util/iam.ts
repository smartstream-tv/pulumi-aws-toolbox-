import * as aws from "@pulumi/aws";

export function assumeRolePolicyForAwsService(serviceName: AwsService): aws.iam.PolicyDocument {
    return {
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Action: "sts:AssumeRole",
            Principal: {
                Service: `${serviceName}.amazonaws.com`,
            },
        }]
    };
}

export type AwsService = "lambda";
