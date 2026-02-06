import RequestHandler from './handler/request.handler.mjs';
import {listVariableHandler, setVariableHandler,unSetVariableHandler} from './handler/variable.handler.mjs';
import  CollectionHandler from './handler/collection.handler.mjs';
import { ensureFileExists } from './utils/fileHandle.mjs';
import runFromCollectionHandler from './handler/runFromCollection.handler.mjs';
import sequenceHandler from './handler/sequence.handler.mjs';
import { importPostmanCollection, exportPostmanCollection } from './handler/postman.handler.mjs';

const builder   = {
    async requestHandler(argv){
        return RequestHandler(argv);
    },
    async setVariableHandler(argv){
        return setVariableHandler(argv);
    },
    async unSetVariableHandler(argv){
        return unSetVariableHandler(argv);
    },
    async listVariableHandler(argv){
        return listVariableHandler(argv);
    },
    async collectionHandler(argv, runtimeScopes){
        return CollectionHandler(argv, runtimeScopes);
    },
    async runRequestFromCollection(argv, runtimeScopes){
        return runFromCollectionHandler(argv, runtimeScopes);
    },
    async sequenceHandler(argv, runtimeScopes){
        return sequenceHandler(argv, runtimeScopes);
    },
    async postmanImport(argv){
        return importPostmanCollection(argv);
    },
    async postmanExport(argv){
        return exportPostmanCollection(argv);
    },
    async init(){
        await ensureFileExists();
    }
}

export default builder;
