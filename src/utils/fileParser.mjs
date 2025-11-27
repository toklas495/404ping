import CliError from "./Error.mjs";
import { variableParser } from "./fileHandle.mjs";

// file parser
const fileParser = (input)=>{
    try{
        // if(typeof input==="object") 
        if(input&&typeof input==="object") return objectParser(input);
        if(input&&typeof input==="string") return stringParser(input);
    }catch(error){
        throw error;
    }
}

const objectParser = async (config)=>{
    try{
        if(!config.url || !config.method) throw new CliError({isKnown:true,message:"Invalid File Format! <must contain url and method>"});
        let url = config.url;
        let headers = [];
        // add search query
        if(config.query&&typeof config.query==="object"){
            let querystring = [];
            for(let [key,value] of Object.entries(config.query)){
                querystring.push([key,value].join("="))
            }
            url+="?"+querystring.join("&");
        }
        // config headers 
        if(config.headers&&typeof config.headers==="object"){
            for(let [key,value] of Object.entries(config.headers)){
                headers.push(`${key}:${value}`);
            }
        }

        // cookies
        let cookieHeader = "";
        if(config.cookies&&typeof config.cookies==="object"){
            cookieHeader = Object.entries(config.cookies)
                            .map(([k,v])=>`${k}=${v}`)
                            .join("; ");
            headers.push(`Cookie:${cookieHeader}`);
        }

        // convert body to json string
        const bodyData = config.body?(
                            (typeof config.body==="object")?JSON.stringify(config.body):config.body
                        ):undefined;
        return {url,header:headers,data:bodyData,method:config.method};
        
    }catch(error){
        if(error.code==="ERR_INVALID_URL") {
            throw new CliError({
                isKnown: true,
                message: `Invalid URL format: ${config.url}`,
                code: error.code,
                category: "validation"
            });
        }
        throw error;
    }
}

export function stringParser(raw) {
    raw = raw.trim();
    const lines = raw.split(/\r?\n/);

    // ---- 1. Parse method + URL ----
    let index = 0;

    // skip empty lines at start
    while (index < lines.length && lines[index].trim() === "") index++;

    const [method, fullUrl] = lines[index].trim().split(/\s+/);
    let url = fullUrl;

    index++; // move to header section

    // ---- 2. Parse headers ----
    const headers = [];

    // skip blank lines before headers
    while (index < lines.length && lines[index].trim() === "") index++;

    for (; index < lines.length; index++) {
        const line = lines[index].trim();

        if (line === "") {
            // reached blank line → body starts after this
            index++;
            break;
        }

        const [key, ...rest] = line.split(":");
        const value = rest.join(":").trim();

        headers.push(`${key.trim()}:${value}`);
    }

    // ---- 3. Parse body ----
    // skip blank lines before body
    while (index < lines.length && lines[index].trim() === "") index++;

    const bodyText = lines.slice(index).join("\n").trim();

    let data;
    if (bodyText) {
        try {
            data = JSON.stringify(JSON.parse(bodyText));
        } catch {
            data = bodyText;
        }
    }

    // ---- 4. Final output (format you need) ----
    return {
        url,
        header: headers,
        data,
        method
    };
}



export default fileParser;
