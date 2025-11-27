import CliError from "./Error.mjs";
import {URL} from 'url';
import { variableParser } from "./fileHandle.mjs";

// file parser
const fileParser = (input)=>{
    try{
        // if(typeof input==="object") 
        if(input&&typeof input==="object") return objectParser(input);
    }catch(error){
        throw error;
    }
}

const objectParser = async (config)=>{
    try{
        if(!config.url || !config.method) throw new CliError({isKnown:true,message:"Invalid File Format! <must contain url and method>"});
        let parsedUrl = await variableParser(config.url);
        const reqUrl = new URL(parsedUrl);
        let headers = [];
        // add search query
        if(config.query&&typeof config.query==="object"){
            for(let [key,value] of Object.entries(config.query)){
                reqUrl.searchParams.append(key,value);
            }
        }
        // config headers 
        if(config.headers&&typeof config.headers==="object"){
            for(let [key,value] of Object.entries(config.headers)){
                headers.append(`${key}:${value}`);
            }
        }

        // cookies
        let cookieHeader = "";
        if(config.cookies&&typeof config.cookies==="object"){
            cookieHeader = Object.entries(config.cookies)
                            .map((k,v)=>`${k}=${v}`)
                            .join("; ");
            headers.append(`${Cookie}:${cookieHeader}`);
        }

        // convert body to json string
        const bodyData = config.body?(
                            (typeof config.body==="object")?JSON.stringify(config.body):config.body
                        ):undefined;
        return {url:reqUrl.toString(),header:headers,data:bodyData,method:config.method};
        
    }catch(error){
        if(error.code==="ERR_INVALID_URL") throw new CliError({isKnown:true,mesage:`Invalid Url Format! ${config.url}`});
        throw error;
    }
}


export default fileParser;
