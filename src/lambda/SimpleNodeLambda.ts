import * as aws from "@pulumi/aws";
import * as awsInputs from "@pulumi/aws/types/input";
import * as pulumi from "@pulumi/pulumi";
import { ComponentResourceOptions } from "@pulumi/pulumi";
import { IVpc } from "../vpc";
import { BaseLambda } from "./BaseLambda";

/**
 * Creates a Nodejs AWS Lambda with useful defaults for small & simple tasks.
 */
export class SimpleNodeLambda extends BaseLambda {
    constructor(name: string, args: SimpleNodeLambdaArgs, opts?: ComponentResourceOptions) {
        super("pat:lambda:SimpleNodeLambda", name, {
            vpc: args.vpc,
            build: (logGroup, roleArn, vpcConfig) => ({
                description: args.codeDir.substring(args.codeDir.lastIndexOf('/') + 1),
                code: new pulumi.asset.AssetArchive({
                    ".": new pulumi.asset.FileArchive(args.codeDir),
                }),
                handler: `index.handler`,
                runtime: aws.lambda.Runtime.NodeJS20dX,
                architectures: ["arm64"],
                role: roleArn,
                memorySize: args.memorySize ?? 128,
                timeout: args.timeout ?? 60,
                environment: {
                    variables: args.environmentVariables,
                },
                vpcConfig,
                loggingConfig: {
                    logGroup: logGroup.name,
                    logFormat: "Text",
                },
            }),
        }, opts);
    }
}

export interface SimpleNodeLambdaArgs {
    /**
     * A directory with the JS source code to deploy.
     * It must contain a index.js/index.mjs file with a handler function.
     */
    codeDir: string;

    /**
     * Map of environment variables for the function.
     */
    environmentVariables?: pulumi.Input<{
        [key: string]: pulumi.Input<string>;
    }>;

    /**
     * Amount of memory in MB your Lambda Function can use at runtime. Defaults to `128`. See [Limits](https://docs.aws.amazon.com/lambda/latest/dg/limits.html)
     */
    memorySize?: number;

    roleInlinePolicies?: pulumi.Input<pulumi.Input<awsInputs.iam.RoleInlinePolicy>[]>;

    /**
     * Additional managed policys for the lambda. A policy to write to Cloudwatch Logs is added automatically.
     */
    roleManagedPolicies?: aws.ARN[];

    /**
     * Amount of time your Lambda Function has to run in seconds. Defaults to `60`.
     */
    timeout?: number;

    /**
     * If specified, the Lambda will created using the VPC's private subnets.
     */
    vpc?: IVpc;

}
