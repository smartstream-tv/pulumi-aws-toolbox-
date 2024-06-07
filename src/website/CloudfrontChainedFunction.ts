import * as aws from "@pulumi/aws";
import { ComponentResource, ComponentResourceOptions } from "@pulumi/pulumi";
const fs = require("fs");


/**
 * Creates a CloudFront function that processes the request/response through a chain of handlers.
 * The first handler that returns a non-null value wins, and no other handlers are executed.
 */
export class CloudfrontChainedFunction extends ComponentResource {
    readonly eventType: EventType;
    readonly func: aws.cloudfront.Function;
    private resourcesDir: string;

    constructor(name: string, args: ChainedCloudfrontFunctionArgs, opts?: ComponentResourceOptions) {
        super("pat:website:CloudfrontChainedFunction", name, args, opts);
        this.eventType = args.eventType;
        this.resourcesDir = `${__dirname}/../../resources/cloudfront-function-handlers`;

        const handlerNames = args.handlerChain.map(handler => handler.name).join();
        let code = `const handlerChain = [${handlerNames}];

        async function handler(event) {
            const input = ${args.eventType == "viewer-request" ? "event.request" : "event.response"};
            for (let i = 0; i < handlerChain.length; i++) {
                const handler = handlerChain[i];
                const processed = await handler(input);
                if (processed != null) {
                    return processed;
                }
            }
            return input;
        }`;

        for (const handler of args.handlerChain) {
            let handlerCode = fs.readFileSync(`${this.resourcesDir}/${args.eventType}/${handler.name}.js`, "utf-8");
            if (handler.replacements) {
                Object.keys(handler.replacements).forEach(key => {
                    const value = handler.replacements![key];
                    handlerCode = handlerCode.replace(key, value);
                });
            }
            code += `\n\n// ----------- Handler: ${handler.name} -----------\n`;
            code += handlerCode;
        }

        this.func = new aws.cloudfront.Function(name, {
            runtime: "cloudfront-js-2.0",
            comment: `${handlerNames}`,
            publish: true,
            code,
        }, {
            parent: this
        });
    }

    toAssociation() {
        return {
            eventType: this.eventType,
            functionArn: this.func.arn,
        };
    }

}

export interface ChainedCloudfrontFunctionArgs {
    readonly eventType: EventType;
    readonly handlerChain: Handler[];
}

export interface Handler {
    /**
     * Name of the handler. The file name and function name of the handler code must have the same name.
     */
    readonly name: string;

    readonly replacements?: { [key: string]: string };
}

export type EventType = `viewer-request` | `viewer-response`;
