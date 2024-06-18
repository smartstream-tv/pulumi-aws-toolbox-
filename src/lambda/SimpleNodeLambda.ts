import * as aws from "@pulumi/aws";
import * as awsInputs from "@pulumi/aws/types/input";
import * as pulumi from "@pulumi/pulumi";
import { ComponentResource, ComponentResourceOptions } from "@pulumi/pulumi";
import { IVpc, StdSecurityGroup } from "../vpc";

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
                (args.vpc != undefined ? aws.iam.ManagedPolicies.AWSLambdaVPCAccessExecutionRole : aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole),
                ...(args.roleManagedPolicies ?? []),
            ],
            inlinePolicies: args.roleInlinePolicies,
        }, { parent: this });

        const vpcConfig = args.vpc != undefined ? (() => {
            const sg = new StdSecurityGroup(name, {
                vpc: args.vpc,
                ingressPorts: [],
                publicIngress: false,
            });

            return {
                subnetIds: args.vpc.privateSubnetIds,
                securityGroupIds: [sg.securityGroupId],
                ipv6AllowedForDualStack: true,
            };
        })() : undefined;

        const func = new aws.lambda.Function(name, {
            description: args.codeDir.substring(args.codeDir.lastIndexOf('/') + 1),
            code: new pulumi.asset.AssetArchive({
                ".": new pulumi.asset.FileArchive(args.codeDir),
            }),
            handler: `index.handler`,
            runtime: aws.lambda.Runtime.NodeJS20dX,
            architectures: ["arm64"],
            role: role.arn,
            memorySize: 128,
            timeout: 60,
            environment: {
                variables: args.environmentVariables,
            },
            vpcConfig,
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

    /**
     * Map of environment variables for the function.
     */
    environmentVariables?: pulumi.Input<{
        [key: string]: pulumi.Input<string>;
    }>;

    roleInlinePolicies?: pulumi.Input<pulumi.Input<awsInputs.iam.RoleInlinePolicy>[]>;

    /**
     * Additional managed policys for the lambda. A policy to write to Cloudwatch Logs is added automatically.
     */
    roleManagedPolicies?: aws.ARN[];

    /**
     * If specified, the Lambda will created using the VPC's private subnets.
     */
    vpc?: IVpc;
}
