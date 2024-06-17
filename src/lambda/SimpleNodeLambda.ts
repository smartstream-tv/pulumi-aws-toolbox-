import * as aws from "@pulumi/aws";
import * as awsInputs from "@pulumi/aws/types/input";
import * as pulumi from "@pulumi/pulumi";
import { ComponentResource, ComponentResourceOptions } from "@pulumi/pulumi";

/**
 * Creates a Nodejs AWS Lambda with useful defaults for small & simple tasks.
 */
export class SimpleNodeLambda extends ComponentResource {
    readonly functionArn: pulumi.Output<string>;
    readonly functionName: pulumi.Output<string>;

    constructor(name: string, args: SimpleNodeLambdaArgs, opts?: ComponentResourceOptions) {
        super("pat:lambda:SimpleNodeLambda", name, args, opts);

        const logGroup = new aws.cloudwatch.LogGroup(name, {
            name: pulumi.interpolate`/aws/lambda/${name}`,
            retentionInDays: 365,
        }, { parent: this });

        const role = new aws.iam.Role(name, {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: {
                        Service: "lambda.amazonaws.com",
                    },
                    Action: "sts:AssumeRole"
                }]
            }),
            managedPolicyArns: [
                aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
                ...(args.roleManagedPolicies ?? []),
            ],
            inlinePolicies: args.roleInlinePolicies,
        }, { parent: this });

        const func = new aws.lambda.Function(name, {
            description: args.codeDir.substring(args.codeDir.lastIndexOf('/') + 1),
            code: new pulumi.asset.AssetArchive({
                ".": new pulumi.asset.FileArchive(args.codeDir),
            }),
            handler: `index.handler`,
            runtime: aws.lambda.Runtime.NodeJS20dX,
            role: role.arn,
            memorySize: 128,
            timeout: 60,
            environment: {
                variables: args.environmentVariables,
            },
        }, {
            dependsOn: [logGroup],
            parent: this
        });

        this.functionArn = func.arn;
        this.functionName = func.name;
    }
}

export interface SimpleNodeLambdaArgs {
    /**
     * A directory with the JS source code to deploy.
     * It must contain a index.js/index.mjs file with a handler function.
     */
    codeDir: string;

    roleInlinePolicies?: pulumi.Input<pulumi.Input<awsInputs.iam.RoleInlinePolicy>[]>;

    /**
     * Additional managed policys for the lambda. A policy to write to Cloudwatch Logs is added automatically.
     */
    roleManagedPolicies?: aws.ARN[];

    /**
     * Map of environment variables for the function.
     */
    environmentVariables?: pulumi.Input<{
        [key: string]: pulumi.Input<string>;
    }>;
}
