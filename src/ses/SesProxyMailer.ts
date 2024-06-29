import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ComponentResourceOptions } from "@pulumi/pulumi";
import { SimpleNodeLambda } from "../lambda";

/**
 * Creates a AWS Lambda to send email using SES.
 * 
 * It acts as a proxy for the SendRawEmail command, allowing you
 *  - to send email from a private subnet using IPv6 (SES doesn't support IPv6 yet)
 *  - to send email from a different account by assuming another role.
 */
export class SesProxyMailer extends SimpleNodeLambda {

    constructor(name: string, args: SesProxyMailerArgs, opts?: ComponentResourceOptions) {
        super(name, {
            codeDir: `${__dirname}/../../resources/ses-proxy-mailer`,
            roleInlinePolicies: [
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
            ],
            environmentVariables: args.assumeRoleArn ? {
                ASSUME_ROLE_ARN: args.assumeRoleArn
            } : undefined,
        }, opts, "pat:ses:SesProxyMailer");
    }

}

export interface SesProxyMailerArgs {
    assumeRoleArn?: string | pulumi.Output<string>;
}
