import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ComponentResource, ComponentResourceOptions } from "@pulumi/pulumi";

/**
 * Creates a AWS Lambda to send email using SES.
 * 
 * It acts as a proxy for the SendRawEmail command, allowing you
 *  - to send email from a private subnet using IPv6 (SES doesn't support IPv6 yet)
 *  - to send email from a different account by assuming another role.
 */
export class SesProxyMailer extends ComponentResource {
    readonly lambdaArn: pulumi.Output<string>;
    readonly lambdaName: pulumi.Output<string>;

    constructor(name: string, args: SesProxyMailerArgs, opts?: ComponentResourceOptions) {
        super("pat:ses:SesProxyMailer", name, args, opts);

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
            ],
            inlinePolicies: [
                ...(args.assumeRoleArn ? [
                    {
                        name: "STS",
                        policy: aws.iam.getPolicyDocumentOutput({
                            statements: [{
                                actions: ["sts:AssumeRole"],
                                resources: [args.assumeRoleArn],
                            }]
                        }).apply(doc => doc.json),
                    }
                ] : [])
            ]
        }, { parent: this });

        const lambda = new aws.lambda.Function(name, {
            description: `pat:SesProxyMailer`,
            code: new pulumi.asset.AssetArchive({
                ".": new pulumi.asset.FileArchive(`${__dirname}/../../resources/ses-proxy-mailer`),
            }),
            handler: `index.handleRequest`,
            runtime: aws.lambda.Runtime.NodeJS20dX,
            role: role.arn,
            memorySize: 128,
            timeout: 60,
            environment: {
                variables: args.assumeRoleArn ? {
                    ASSUME_ROLE_ARN: args.assumeRoleArn
                } : {}
            },
        }, {
            dependsOn: [logGroup],
            parent: this
        });

        this.lambdaArn = lambda.arn;
        this.lambdaName = lambda.name;
    }
}

export interface SesProxyMailerArgs {
    assumeRoleArn?: string | pulumi.Output<string>;
}
