import Request from "../utils/asyncRequestHandle.mjs";
import { URL as URLBUILDER } from "url";
import {variableParser,loadFile} from '../utils/fileHandle.mjs';
import CliError from "../utils/Error.mjs";
import PrintOutput from "../utils/printOutput.mjs";
import http from 'http';
import https from 'https';
import fileParser from "../utils/fileParser.mjs";



async function fetchWithRedirect(options, res, debug=false,maxRedirect = 4) {
    let redirect = 0;
    let payload = options.body || null;


    while (true) {
        if (redirect >= maxRedirect) {
            throw new CliError({
                isKnown: true,
                message: `Max redirects (${maxRedirect}) exceeded`
            });
        }

        const status = res.meta.status;

        if (![301, 302, 303, 307, 308].includes(status)) {
            return res; // no redirect → return final response
        }

        redirect++;

        // --------------------------------------
        // location header check
        // --------------------------------------
        const location = res.response.headers.location;
        if (!location) {
            throw new CliError({
                isKnown: true,
                message: "Redirect status but no location header!"
            });
        }

        // --------------------------------------
        // Resolve new URL
        // --------------------------------------
        const redirectUrl = new URL(location, `${options.protocol}//${options.host}`);

        // --------------------------------------
        // Update request options
        // --------------------------------------
        if(debug) console.log(`↪ Redirect (${status}): ${options.protocol}//${options.host} -> ${redirectUrl.href}`)

        options = {
            protocol: redirectUrl.protocol.replace(':',''),
            host: redirectUrl.hostname,
            port: redirectUrl.port || (redirectUrl.protocol === "https:" ? 443 : 80),
            path: redirectUrl.pathname + redirectUrl.search,
            method: options.method,
            headers: { ...options.headers },
            body: payload
        };

        // --------------------------------------
        // Change method based on redirect type
        // --------------------------------------
        if ([301, 302, 303].includes(status)) {
            options.method = "GET";
            options.body = null;
            payload = null;
        }

        // For 307 & 308 → keep method + body

        // --------------------------------------
        // Send the new request
        // --------------------------------------
        const httpModule = options.protocol === "https" ? https : http;
        const request = new Request(httpModule);

        request.addMethod(options.method);
        request.addHeaders(options.headers);
        request.addHost(options.host);
        request.addPort(options.port);
        request.addPath(options.path);

        if (options.body) request.addBody(options.body);

        res = await request.send(); // ★ send again
    }
}



export default async function RequestHandler(args = {}) {
    let { method = "GET", url, data, header = [],s_header,size,info,raw,debug,connection,tls,redirect,timeout} = args;

    if (!url) {
        throw new CliError({isKnown:true,message:"ERROR: URL is required",type:"warn"});
    }
    if(typeof url=="string" && url.startsWith("@")){
        const reqFromFile = await loadFile(url);
        const {url:get_url,method:get_method,header:get_header,data:get_data} = await fileParser(reqFromFile);
        url = get_url;
        method=method||get_method;
        header=header||get_header;
        data=data||get_data;
    } 
    try{  
        // parse variable 
        url = await variableParser(url);
        method=await variableParser(method);
        data = typeof data==='string'?await variableParser(data):data;
        header = await Promise.all(header.map(h=>variableParser(h)));
        
        // normalize the url
        if(!/^https?:\/\//i.test(url)) url=`http://${url}`;

        const urlparams = new URLBUILDER(url);
        const httpModule = urlparams.protocol.slice(0,-1)==="https"?https:http;
        const request = new Request(httpModule);
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
        if(timeout) request.addTimeout(timeout);
        request.addPath(urlparams.pathname + urlparams.search); // include query params

        // --- Send request ---
        let response = await request.send();
        if(redirect&&[301,302,303,307,308].includes(response.meta.status)){
            response = await fetchWithRedirect({
                protocol:urlparams.protocol,
                method:method.toUpperCase(),
                headers:headers,
                host:urlparams.hostname,
                body:data
            },response,debug);
        }
        //pring the response
        const mode =s_header ? "header" :
                    raw      ? "raw" :
                    size     ? "size" :
                    info     ? "info" :
                    debug    ? "debug" :
                    connection ? "connection":
                    tls?"tls":"body";
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
