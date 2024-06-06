#!/usr/bin/env bash
set -e

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
BUCKET="pulumi-state-${AWS_ACCOUNT_ID}"

mkdir -p ~/.pulumi
cat >~/.pulumi/credentials.json <<EOL
{
    "current": "s3://${BUCKET}",
    "accessTokens": {
        "s3://${BUCKET}": ""
    },
    "accounts": {
        "s3://${BUCKET}": {
            "lastValidatedAt": "0001-01-01T00:00:00Z"
        }
    }
}
EOL
