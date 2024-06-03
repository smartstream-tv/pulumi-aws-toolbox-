import * as aws from "@pulumi/aws";

let callerIdentity: aws.GetCallerIdentityResult;
let region: aws.GetRegionResult;
let initialized = false;

export async function init() {
    callerIdentity = await aws.getCallerIdentity({});
    region = (await aws.getRegion());
    initialized = true;
}

function checkInitialized() {
    if (!initialized) throw new Error("Not initialized. Please call init() first.");
}

export function getAccountId() {
    checkInitialized();
    return callerIdentity.accountId;
}

export function getRegion() {
    checkInitialized();
    return region.name;
}
