import { readRequestFile, saveRequestInCollection } from "../utils/fileHandle.mjs";
import RequestHandler from "./request.handler.mjs";
import CliError from "../utils/Error.mjs";
import theme from "../utils/theme.mjs";

function normalizeListOption(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

export default async function runFromCollectionHandler(argv = {}, runtimeScopes = {}) {
    try {
        if (!argv.collection_request || typeof argv.collection_request !== 'string') {
            throw new CliError({
                isKnown: true,
                message: "Collection request format required: collection:request",
                type: "warn",
                category: "validation"
            });
        }

        const parts = argv.collection_request.split(":").map((v) => v.trim());
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            throw new CliError({
                isKnown: true,
                message: `Invalid format: "${argv.collection_request}". Must be "collection:request"`,
                type: "warn",
                category: "validation"
            });
        }
        const [collection, reqName] = parts;

        if (!/^[a-zA-Z0-9_\-]+$/.test(collection) || !/^[a-zA-Z0-9_\-]+$/.test(reqName)) {
            throw new CliError({
                isKnown: true,
                message: "Collection and request names must be alphanumeric with optional - or _",
                type: "warn",
                category: "validation"
            });
        }

        const request = await readRequestFile(collection, reqName);

        const cliHeaders = normalizeListOption(argv.header);
        const headers = cliHeaders.length ? cliHeaders : (request.header || []);

        const combinedAssertions = [
            ...(request.assertions || []),
            ...normalizeListOption(argv.assert)
        ];
        const combinedExtract = [
            ...(request.extract || []),
            ...normalizeListOption(argv.extract)
        ];

        const originalEnv = runtimeScopes.env;
        if (request.env) {
            runtimeScopes.env = { ...(runtimeScopes.env || {}), ...request.env };
        }

        let response;
        try {
            response = await RequestHandler({
            ...request,
            ...argv,
            url: argv.url || request.url,
            method: argv.method || request.method || "GET",
            header: headers,
            data: argv.data !== undefined ? argv.data : request.data,
            filter: argv.filter !== undefined ? argv.filter : request.filter,
            bearer: argv.bearer ?? request.bearer,
            basic: argv.basic ?? request.basic,
            timeout: argv.timeout !== undefined ? argv.timeout : request.timeout,
            insecure: argv.insecure !== undefined ? argv.insecure : request.insecure,
            redirect: argv.redirect !== undefined ? argv.redirect : request.redirect,
            benchmark: argv.benchmark !== undefined ? argv.benchmark : request.benchmark,
            preScript: argv.preScript || request.preScript,
            postScript: argv.postScript || request.postScript,
            assert: combinedAssertions,
            extract: combinedExtract,
            runtimeScopes
            });
        } finally {
            if (originalEnv !== undefined) {
                runtimeScopes.env = originalEnv;
            } else {
                delete runtimeScopes.env;
            }
        }

        let saveTarget = argv.save;
        if (saveTarget === true) {
            saveTarget = `${collection}.${reqName}`;
        }

        if (saveTarget) {
            if (typeof saveTarget !== "string" || !saveTarget.includes(".")) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid --save target: "${saveTarget}". Use collection.request`,
                    category: "validation",
                    type: "warn"
                });
            }

            const [targetCollection, targetRequest] = saveTarget.split(".").map((segment) => segment.trim());
            if (!targetCollection || !targetRequest) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid --save target: "${saveTarget}". Collection and request names are required`,
                    category: "validation",
                    type: "warn"
                });
            }
            if (!/^[a-zA-Z0-9_\-]+$/.test(targetCollection) || !/^[a-zA-Z0-9_\-]+$/.test(targetRequest)) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid --save target: "${saveTarget}". Use alphanumeric, dash, underscore`,
                    category: "validation",
                    type: "warn"
                });
            }

            const reqBody = {
                url: response.request.url,
                method: response.request.method,
                header: response.request.header,
                data: response.request.data,
                env: request.env,
                assertions: combinedAssertions,
                extract: combinedExtract,
                filter: argv.filter !== undefined ? argv.filter : request.filter,
                bearer: argv.bearer ?? request.bearer,
                basic: argv.basic ?? request.basic,
                timeout: argv.timeout !== undefined ? argv.timeout : request.timeout,
                insecure: argv.insecure !== undefined ? argv.insecure : request.insecure,
                redirect: argv.redirect !== undefined ? argv.redirect : request.redirect,
                benchmark: argv.benchmark !== undefined ? argv.benchmark : request.benchmark,
                preScript: argv.preScript || request.preScript,
                postScript: argv.postScript || request.postScript
            };
            await saveRequestInCollection(targetCollection, targetRequest, reqBody);
            console.log(theme.success(`\n✓ Request saved to collection "${targetCollection}" as "${targetRequest}"`));
        }

        return;
    } catch (error) {
        if (error instanceof CliError) {
            throw error;
        }
        throw new CliError({
            isKnown: true,
            message: `Failed to run request from collection: ${error.message}`,
            category: "file",
            originalError: error
        });
    }
}