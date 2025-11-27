import { readRequestFile, saveRequestInCollection } from "../utils/fileHandle.mjs";
import RequestHandler from "./request.handler.mjs";
import CliError from "../utils/Error.mjs";

export default async function runFromCollectionHandler(argv){
    try {
        if (!argv.collection_request || typeof argv.collection_request !== 'string') {
            throw new CliError({
                isKnown: true,
                message: "Collection request format required: collection:request",
                type: "warn",
                category: "validation"
            });
        }
        
        if (!argv.collection_request.includes(':')) {
            throw new CliError({
                isKnown: true,
                message: `Invalid format: "${argv.collection_request}". Must be "collection:request"`,
                type: "warn",
                category: "validation"
            });
        }
        
        const parts = argv.collection_request.split(":").map(v => v.trim());
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            throw new CliError({
                isKnown: true,
                message: `Invalid format: "${argv.collection_request}". Must be "collection:request"`,
                type: "warn",
                category: "validation"
            });
        }
        
        const [collection, reqName] = parts;
        
        // Validate collection and request names
        if (!/^[a-zA-Z0-9_\-]+$/.test(collection)) {
            throw new CliError({
                isKnown: true,
                message: `Invalid collection name: "${collection}"`,
                type: "warn",
                category: "validation"
            });
        }
        
        if (!/^[a-zA-Z0-9_\-]+$/.test(reqName)) {
            throw new CliError({
                isKnown: true,
                message: `Invalid request name: "${reqName}"`,
                type: "warn",
                category: "validation"
            });
        }
        
        const {save} = argv;
        const request = await readRequestFile(collection, reqName);
        
        // Merge request from file with command line overrides
        argv = {...request, ...argv};
        
        const response = await RequestHandler(argv);
        
        // Only save if --save flag is set
        if(save) {
            const reqBody = {
                url: response.request.url,
                method: response.request.method,
                header: response.request.header,
                data: response.request.data
            };
            await saveRequestInCollection(collection, reqName, reqBody);
        }
        
        return;
    }catch(error){
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