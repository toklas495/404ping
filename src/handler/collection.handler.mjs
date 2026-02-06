import CliError from "../utils/Error.mjs";
import { createCollection, readCollectionFile, saveRequestInCollection } from "../utils/fileHandle.mjs";
import theme from "../utils/theme.mjs";
import RequestHandler from "./request.handler.mjs";

function ensureName(value, label) {
    if (!value || !/^[a-zA-Z0-9_\-]+$/.test(value)) {
        throw new CliError({
            isKnown: true,
            message: `${label} is required and must contain only alphanumeric characters, underscores, and hyphens`,
            type: "warn",
            category: "validation"
        });
    }
}

export default async function collectionHandler(argv = {}, runtimeScopes = {}) {
    const { action, name, request } = argv;

    switch (action) {
        case "create": {
            ensureName(name, "Collection name");
            await createCollection(name);
            return;
        }
        case "list": {
            const content = await readCollectionFile();
            console.log(theme.success(content));
            return;
        }
        case "show": {
            ensureName(name, "Collection name");
            const raw = await readCollectionFile();
            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch (parseError) {
                throw new CliError({
                    isKnown: true,
                    message: "Invalid JSON in collection file",
                    category: "file",
                    originalError: parseError
                });
            }
            if (!parsed.hasOwnProperty(name)) {
                throw new CliError({
                    isKnown: true,
                    message: `Collection "${name}" not found`,
                    category: "file",
                    type: "error"
                });
            }
            console.log(theme.success(JSON.stringify(parsed[name], null, 2)));
            return;
        }
        case "save": {
            ensureName(name, "Collection name");
            ensureName(request, "Request name");
            if (!argv.url) {
                throw new CliError({
                    isKnown: true,
                    message: "URL is required when saving a request",
                    category: "validation",
                    type: "warn"
                });
            }

            const headers = Array.isArray(argv.header) ? argv.header : (argv.header ? [argv.header] : []);
            const method = argv.method || "GET";
            const runtimeArgs = {
                ...argv,
                method,
                header: headers,
                runtimeScopes
            };

            await RequestHandler(runtimeArgs);

            const requestPayload = {
                url: argv.url,
                method,
                header: headers,
                data: argv.data,
                env: argv.env || {},
                assertions: argv.assert || [],
                extract: argv.extract || [],
                filter: argv.filter,
                bearer: argv.bearer,
                basic: argv.basic,
                timeout: argv.timeout,
                insecure: argv.insecure,
                redirect: argv.redirect,
                benchmark: argv.benchmark,
                preScript: argv.preScript,
                postScript: argv.postScript
            };

            await saveRequestInCollection(name, request, requestPayload);
            console.log(theme.success(`\n✓ Request saved to collection "${name}" as "${request}"`));
            return;
        }
        default:
            throw new CliError({
                isKnown: true,
                message: `Unknown collection action: "${action}"`,
                type: "warn",
                category: "validation"
            });
    }
}