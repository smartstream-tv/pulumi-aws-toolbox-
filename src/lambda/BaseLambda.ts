import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ComponentResource, ComponentResourceOptions } from "@pulumi/pulumi";
import { assumeRolePolicyForAwsService } from "../util/iam";
import { IVpc, StdSecurityGroup } from "../vpc";

/**
 * Base class that makes it easier to create a AWS Lambda.
 * Creates a log group, role that can be used to construct the actual lambda function.
 */
export abstract class BaseLambda extends ComponentResource {
    readonly functionArn: pulumi.Output<string>;
    readonly functionName: pulumi.Output<string>;

    constructor(type: string, name: string, args: BaseLambdaArgs, opts: ComponentResourceOptions, functionArgsFactory: FunctionArgsFactory) {
        super(type, name, args, opts);

        const logGroup = new aws.cloudwatch.LogGroup(name, {
            name: pulumi.interpolate`/aws/lambda/${name}`,
            retentionInDays: 365,
        }, { parent: this });

        const role = new aws.iam.Role(`${name}-execute`, {
            assumeRolePolicy: assumeRolePolicyForAwsService("lambda"),
        }, { parent: this });

        // attach default policy for VPC and logging
        if (args.vpc != undefined) {
            new aws.iam.RolePolicyAttachment(`${name}-default`, {
                role,
                policyArn: aws.iam.ManagedPolicies.AWSLambdaVPCAccessExecutionRole,
            });
        } else {
            new aws.iam.RolePolicyAttachment(`${name}-default`, {
                role,
                policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
            });
        }

        // create user policies - not using 'inlinePolicies' property because removal behavior is exteremly suprising
        args.roleManagedPolicies?.forEach((policyArn, index) => {
            new aws.iam.RolePolicyAttachment(`${name}-${index}`, {
                role,
                policyArn,
            });
        });
        args.roleInlinePolicies?.forEach(inlinePolicy => {
            new aws.iam.RolePolicy(`${name}-${inlinePolicy.name}`, {
                role,
                policy: inlinePolicy.policy,
            });
        });

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

        const func = new aws.lambda.Function(name,
            functionArgsFactory(logGroup, role.arn, vpcConfig)
            , {
                dependsOn: [logGroup],
                parent: this
            });

        this.functionArn = func.arn;
        this.functionName = func.name;
    }
}

export interface BaseLambdaArgs {
    /**
     * Inline policies for the Lambda function.
     */
    roleInlinePolicies?: RoleInlinePolicy[];

    /**
     * Additional managed policys for the lambda function.
     * Policies to write to the CloudWatch log group and to use the VPC (if relevant) are added automatically.
     */
    roleManagedPolicies?: aws.ARN[];

    /**
     * If specified, the Lambda will created using the VPC's private subnets.
     */
    vpc?: IVpc;
}

export type FunctionArgsFactory = (logGroup: aws.cloudwatch.LogGroup, roleArn: pulumi.Input<aws.ARN>, vpcConfig?: aws.types.input.lambda.FunctionVpcConfig) => aws.lambda.FunctionArgs;

export interface RoleInlinePolicy {
    /**
     * Name of the role policy.
     */
    name: pulumi.Input<string>;
    /**
     * Policy document as a JSON formatted string.
     */
    policy: pulumi.Input<string>;
}
