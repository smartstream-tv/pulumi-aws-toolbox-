import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";
import { fromUtf8 } from "@aws-sdk/util-utf8-node";

const assumeRoleArn = process.env.ASSUME_ROLE_ARN;

export const handler = async (event, context) => {
    console.log("EVENT", JSON.stringify(event, null, 2));

    const ses = await createClient();
    const sendResponse = await ses.send(new SendEmailCommand({
        Content: {
            Raw: {
                Data: fromUtf8(event.message)
            }
        }
    }));

    return {
        lambdaRequestId: context.awsRequestId,
        messageId: sendResponse.MessageId,
    };
};

async function createClient() {
    if (assumeRoleArn) {
        const stsClient = new STSClient();
        const assumeRoleResponse = await stsClient.send(new AssumeRoleCommand({
            RoleArn: assumeRoleArn,
            RoleSessionName: "mailer",
        }));

        return new SESv2Client({
            credentials: {
                accessKeyId: assumeRoleResponse.Credentials.AccessKeyId,
                secretAccessKey: assumeRoleResponse.Credentials.SecretAccessKey,
                sessionToken: assumeRoleResponse.Credentials.SessionToken,
            },
        });
    } else {
        return new SESv2Client();
    }
}
