import * as aws from "@pulumi/aws";

export async function getSsmSecret(name: string): Promise<string> {
    const result = await aws.ssm.getParameter({
        name,
        withDecryption: true
    });
    return result.value;
}
