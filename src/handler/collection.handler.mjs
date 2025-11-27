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
                if(!name||!/^[a-zA-Z0-9_\-]+$/.test(name)) throw new CliError({isKnown:true,message:"Provide Collection name! must not contain invalid chars",type:"warn"});
                await createCollection(name);
                break;
            case "save":
                argv["url"] = url||undefined;
                if(![name,request].every(value=>(value&&/^[a-zA-Z0-9_\-]+$/.test(value)))){
                    throw new CliError({isKnown:true,message:"Provide Collection <collection_name>|<request_name>! must not contain invalid chars",type:"warn"})
                }
                const response = await RequestHandler(argv);
                const request_body = {
                    url:response.request.url,
                    method:response.request.method,
                    header:response.request.header,
                    data:response.request.data
                }
                await saveRequestInCollection(name,request,request_body)
                break;
            case "list":
                const content = await readCollectionFile();
                console.log(theme.success(content));
                break;
            case "show":
                if(!name||!/^[a-zA-Z0-9_\-]+$/.test(name)) throw new CliError({isKnown:true,message:"Provide collection name! must not contain invalid chars",type:"warn"});
                const raw_file  = await readCollectionFile();
                const json_file = JSON.parse(raw_file);
                if(!json_file.hasOwnProperty(name)) throw new CliError({isKnown:true,message:`<collection-${name}> not found!`});
                console.log(theme.success(JSON.stringify(json_file[name],null,2)))
                break;
            default:
        }
    }catch(error){
        throw error;
    }
}