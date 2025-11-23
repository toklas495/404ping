import Request from "../utils/asyncRequestHandle.mjs";
import { URL as URLBUILDER } from "url";
import {variableParser} from '../utils/fileHandle.mjs';
import CliError from "../utils/Error.mjs";
import PrintOutput from "../utils/printOutput.mjs";


export default async function RequestHandler(httpModule, args = {}) {
    const request = new Request(httpModule);
    let { method = "GET", url, data, header = [],s_header,size,info,raw,debug} = args;

    if (!url) {
        throw new CliError({isKnown:true,message:"ERROR: URL is required",type:"warn"});
    }
    // parse variable 
    url = await variableParser(url);
    method=await variableParser(method);
    data = typeof data==='string'?await variableParser(data):data;
    header = await Promise.all(header.map(h=>variableParser(h)));

    // normalize the url
    if(!/^https?:\/\//i.test(url)) url=`http://${url}`;

    try {
        const urlparams = new URLBUILDER(url);

        // --- Headers ---
        const headers = {};
        if (header.length) {
            header.forEach(h => {
                if (!h.includes(":")) throw new CliError({isKnown:true,message:`Invalid header format: "${h}". Must be "Key: Value"`,type:'warn'});
                const [key, value] = h.split(":").map(s => s.trim());
                if (!key || !value) throw new CliError({isKnown:true,message:`Invalid header: "${h}". Key and Value cannot be empty`,type:'warn'});
                headers[key] = value;
            });
            request.addHeaders(headers);
        }

        // --- Method ---
        request.addMethod(method.toUpperCase());

        // --- Body ---
        if (data) {
            let body = data;
            if (typeof data === "string") {
                try {
                    body = JSON.parse(data);
                } catch {
                    // leave as string if not valid JSON
                }
            }
            request.addBody(body);
        }

        // --- URL parts ---
        request.addHost(urlparams.hostname);
        if (urlparams.port) request.addPort(Number(urlparams.port));
        request.addPath(urlparams.pathname + urlparams.search); // include query params

        // --- Send request ---
        const response = await request.send();
        //pring the response
        const mode =s_header ? "header" :
                    raw      ? "raw" :
                    size     ? "size" :
                    info     ? "info" :
                    debug    ? "debug" :"body";
        new PrintOutput(response).print(mode);
        return {...response,request:{method,url:args?.url,header,data:args?.data}}
    } catch (error) {
        // Handle known errors first
        switch(error.code){
            case "ENOTFOUND":
                throw new CliError({isKnown:true,message:"Could not resolve host"});  
            case "ERR_INVALID_URL" :
                throw new CliError({isKnown:true,message:`invalid url format "${url}"`});
            case "ECONNREFUSED":
                throw new CliError({isKnown:true,message:"could not connect host"});
            default:
                if(error instanceof CliError) throw error;
                throw new CliError({message:error.message})
        }
    }
}
