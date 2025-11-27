import CliError from "../utils/Error.mjs";
import { createCollection,readCollectionFile,saveRequestInCollection } from "../utils/fileHandle.mjs";
import theme from "../utils/theme.mjs";
import RequestHandler from "./request.handler.mjs";

export default async function collectionHandler(argv){
    let {action,name,request} = argv;
    const url = argv._[1];


    // create collection
    // if(action==="create")
    try{
        switch(action){
            case "create":
                if(!name||!/^[a-zA-Z0-9_\-]+$/.test(name)) {
                    throw new CliError({
                        isKnown: true,
                        message: "Collection name is required and must contain only alphanumeric characters, underscores, and hyphens",
                        type: "warn",
                        category: "validation"
                    });
                }
                await createCollection(name);
                break;
            case "save":
                argv["url"] = url||undefined;
                if(![name,request].every(value=>(value&&/^[a-zA-Z0-9_\-]+$/.test(value)))){
                    throw new CliError({
                        isKnown: true,
                        message: "Collection name and request name are required and must contain only alphanumeric characters, underscores, and hyphens",
                        type: "warn",
                        category: "validation"
                    });
                }
                
                // IMPORTANT: Capture raw values BEFORE calling RequestHandler
                // This ensures we store the original request with variables like {{host}}
                const rawRequestForSave = {
                    url: argv["url"] || url || undefined,
                    method: argv.method || "GET",
                    header: Array.isArray(argv.header) ? [...argv.header] : (argv.header ? [argv.header] : []),
                    data: argv.data
                };
                
                const response = await RequestHandler(argv);
                
                // Use raw values (with variables) instead of resolved values
                const request_body = {
                    url: rawRequestForSave.url,
                    method: rawRequestForSave.method,
                    header: rawRequestForSave.header,
                    data: rawRequestForSave.data
                };
                await saveRequestInCollection(name, request, request_body);
                break;
            case "list":
                const content = await readCollectionFile();
                console.log(theme.success(content));
                break;
            case "show":
                if(!name||!/^[a-zA-Z0-9_\-]+$/.test(name)) {
                    throw new CliError({
                        isKnown: true,
                        message: "Collection name is required and must contain only alphanumeric characters, underscores, and hyphens",
                        type: "warn",
                        category: "validation"
                    });
                }
                const raw_file = await readCollectionFile();
                let json_file;
                try {
                    json_file = JSON.parse(raw_file);
                } catch (parseError) {
                    throw new CliError({
                        isKnown: true,
                        message: "Invalid JSON in collection file",
                        category: "file",
                        originalError: parseError
                    });
                }
                if(!json_file.hasOwnProperty(name)) {
                    throw new CliError({
                        isKnown: true,
                        message: `Collection "${name}" not found`,
                        category: "file",
                        type: "error"
                    });
                }
                console.log(theme.success(JSON.stringify(json_file[name], null, 2)));
                break;
            default:
                throw new CliError({
                    isKnown: true,
                    message: `Unknown action: "${action}". Valid actions: create, save, list, show`,
                    type: "warn",
                    category: "validation"
                });
        }
    }catch(error){
        throw error;
    }
}