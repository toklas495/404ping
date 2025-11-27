import RequestHandler from './handler/request.handler.mjs';
import {listVariableHandler, setVariableHandler,unSetVariableHandler} from './handler/variable.handler.mjs';
import  CollectionHandler from './handler/collection.handler.mjs';
import errorHandler from './utils/errorHandler.mjs';
import { ensureFileExists } from './utils/fileHandle.mjs';
import runFromCollectionHandler from './handler/runFromCollection.handler.mjs';

const builder   = {
    async requestHandler(argv){
        try{
            await RequestHandler(argv)
        }catch(error){
            errorHandler(error);
        }
    },
    async setVariableHandler(argv){
        try{
            await setVariableHandler(argv);
        }catch(error){
            errorHandler(error);
        }
    },
    async unSetVariableHandler(argv){
        try{
            await unSetVariableHandler(argv);
        }catch(error){
            errorHandler(error);
        }
    },
    async listVariableHandler(argv){try{await listVariableHandler(argv)}catch(error){errorHandler(error)}},
    async collectionHandler(argv){
        try{
            await CollectionHandler(argv);
        }catch(error){
            errorHandler(error);
        }
    },
    async runRequestFromCollection(argv){
        try{
            await runFromCollectionHandler(argv);
        }catch(error){
            errorHandler(error);
        }
    },
    async init(){
        try {
            await ensureFileExists();
        } catch (error) {
            // If init fails, we still want to show the error properly
            errorHandler(error);
            process.exit(1);
        }
    }
}

export default builder;
