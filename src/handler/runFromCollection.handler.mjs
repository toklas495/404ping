import { readRequestFile, saveRequestInCollection } from "../utils/fileHandle.mjs";
import RequestHandler from "./request.handler.mjs";

export default async function runFromCollectionHandler(argv){
    const [collection,reqName] = argv.collection_request.split(":").map(v=>v.trim());
    const {save} = argv;
    try{
        const request = await readRequestFile(collection,reqName);
        argv = {...request,...argv};
        const response = await RequestHandler(argv);
        const reqBody = {
            url:response.request.url,
            method:response.request.method,
            header:response.request.header,
            data:response.request.data
        }
        if(save) await saveRequestInCollection(collection,reqName,reqBody);
        return;
    }catch(error){
        throw error;
    }
}