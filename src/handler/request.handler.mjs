import Request from "../utils/asyncRequestHandle.mjs";
import { URL as URLBUILDER } from "url";
import {variableParser,loadFile,saveRequestInCollection} from '../utils/fileHandle.mjs';
import CliError from "../utils/Error.mjs";
import PrintOutput from "../utils/printOutput.mjs";
import http from 'http';
import https from 'https';
import fileParser from "../utils/fileParser.mjs";
import theme from "../utils/theme.mjs";



async function fetchWithRedirect(options, res, debug=false,maxRedirect = 4) {
    let redirect = 0;
    let payload = options.body || null;


    while (true) {
        if (redirect >= maxRedirect) {
            throw new CliError({
                isKnown: true,
                message: `Maximum redirects (${maxRedirect}) exceeded`,
                category: "http",
                code: "MAX_REDIRECTS",
                details: { maxRedirects: maxRedirect, current: redirect }
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
                message: "Redirect status but no location header",
                category: "http",
                code: "MISSING_LOCATION_HEADER",
                statusCode: status
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
    let { method = "GET", url, data, header = [],s_header,size,info,raw,debug,connection,tls,redirect,timeout,insecure,save} = args;
    let urlparams;
    if (!url) {
        throw new CliError({
            isKnown: true,
            message: "URL is required",
            type: "warn",
            category: "validation"
        });
    }
    
    // IMPORTANT: Capture raw values BEFORE variable parsing for saving
    // This ensures we store the original request with variables like {{host}}
    const rawRequest = {
        url: url,
        method: method,
        header: Array.isArray(header) ? [...header] : (header ? [header] : []),
        data: data
    };
    
    if(typeof url=="string" && url.startsWith("@")){
        const reqFromFile = await loadFile(url);
        const {url:get_url,method:get_method,header:get_header,data:get_data} = await fileParser(reqFromFile);
        url = get_url;
        method=method||get_method;
        header=header||get_header;
        data=data||get_data;
        // Update raw request with file values
        rawRequest.url = get_url;
        rawRequest.method = method||get_method;
        rawRequest.header = get_header||[];
        rawRequest.data = get_data;
    } 
    try{  
        // parse variable 
        url = await variableParser(url);
        method=await variableParser(method);
        data = typeof data==='string'?await variableParser(data):data;
        header = await Promise.all(header.map(h=>variableParser(h)));
        
        // Validate and normalize the url
        if(!/^https?:\/\//i.test(url)) {
            url = `http://${url}`;
        }
        
        // Security: Validate URL format
        try {
            urlparams = new URLBUILDER(url);
        } catch (urlError) {
            throw new CliError({
                isKnown: true,
                message: `Invalid URL format: "${url}"`,
                code: urlError.code || "ERR_INVALID_URL",
                category: "validation",
                url: url
            });
        }
        
        // Security: Only allow http and https protocols
        const protocol = urlparams.protocol.slice(0, -1).toLowerCase();
        if (protocol !== "http" && protocol !== "https") {
            throw new CliError({
                isKnown: true,
                message: `Unsupported protocol: "${protocol}". Only http and https are supported`,
                category: "validation",
                url: url
            });
        }
        const httpModule = urlparams.protocol.slice(0,-1)==="https"?https:http;
        const request = new Request(httpModule, { insecure: insecure || false });
        // --- Headers ---
        const headers = {};
        if (header.length) {
            header.forEach(h => {
                if (!h.includes(":")) {
                    throw new CliError({
                        isKnown: true,
                        message: `Invalid header format: "${h}". Must be "Key: Value"`,
                        type: 'warn',
                        category: "validation",
                        details: { header: h }
                    });
                }
                const [key, value] = h.split(":").map(s => s.trim());
                if (!key || !value) {
                    throw new CliError({
                        isKnown: true,
                        message: `Invalid header: "${h}". Key and Value cannot be empty`,
                        type: 'warn',
                        category: "validation",
                        details: { header: h, key, value }
                    });
                }
                // Validate header key (basic security check)
                if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
                    throw new CliError({
                        isKnown: true,
                        message: `Invalid header key: "${key}". Contains invalid characters`,
                        type: 'warn',
                        category: "validation"
                    });
                }
                headers[key] = value;
            });
            request.addHeaders(headers);
        }

        // --- Method ---
        // Security: Validate HTTP method
        const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
        const upperMethod = method.toUpperCase();
        if (!validMethods.includes(upperMethod)) {
            throw new CliError({
                isKnown: true,
                message: `Invalid HTTP method: "${method}". Allowed methods: ${validMethods.join(", ")}`,
                type: "warn",
                category: "validation"
            });
        }
        request.addMethod(upperMethod);

        // --- Body ---
        if (data) {
            let body = data;
            if (typeof data === "string") {
                // Try to parse as JSON, but don't fail if it's not JSON
                try {
                    body = JSON.parse(data);
                } catch (parseError) {
                    // If it looks like JSON but failed to parse, warn user
                    if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
                        console.warn(theme.warning(`Warning: Data looks like JSON but failed to parse. Sending as string.`));
                    }
                    // leave as string if not valid JSON
                    body = data;
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
        
        // Handle HTTP error status codes (4xx, 5xx)
        const statusCode = response.meta.status;
        if (statusCode >= 400) {
            // Don't throw error here - let user see the response
            // But we can log a warning for non-2xx status codes
            if (statusCode >= 500) {
                // 5xx errors are server errors
                console.error(theme.warning(`Warning: Server error (${statusCode})`));
            } else if (statusCode === 401) {
                console.error(theme.warning(`Warning: Unauthorized - Authentication required`));
            } else if (statusCode === 403) {
                console.error(theme.warning(`Warning: Forbidden - Access denied`));
            } else if (statusCode === 404) {
                console.error(theme.warning(`Warning: Not Found - Resource does not exist`));
            }
        }
        
        if(redirect&&[301,302,303,307,308].includes(response.meta.status)){
            response = await fetchWithRedirect({
                protocol:urlparams.protocol,
                method:method.toUpperCase(),
                headers:headers,
                host:urlparams.hostname,
                body:data
            },response,debug);
        }
        //print the response
        const mode =s_header ? "header" :
                    raw      ? "raw" :
                    size     ? "size" :
                    info     ? "info" :
                    debug    ? "debug" :
                    connection ? "connection":
                    tls?"tls":"body";
        new PrintOutput(response).print(mode);
        
        // Handle --save flag: Save request to collection
        if (save) {
            // Parse collection.request format
            if (!save.includes('.')) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid --save format: "${save}". Must be "collection.request"`,
                    type: "warn",
                    category: "validation"
                });
            }
            
            const [collection_name, request_name] = save.split('.').map(s => s.trim());
            
            if (!collection_name || !request_name) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid --save format: "${save}". Collection and request names cannot be empty`,
                    type: "warn",
                    category: "validation"
                });
            }
            
            // Validate names
            if (!/^[a-zA-Z0-9_\-]+$/.test(collection_name) || !/^[a-zA-Z0-9_\-]+$/.test(request_name)) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid --save format: "${save}". Collection and request names must contain only alphanumeric characters, underscores, and hyphens`,
                    type: "warn",
                    category: "validation"
                });
            }
            
            // Save raw request (with variables, not resolved values)
            const request_body = {
                url: rawRequest.url,
                method: rawRequest.method,
                header: rawRequest.header,
                data: rawRequest.data
            };
            
            await saveRequestInCollection(collection_name, request_name, request_body);
            console.log(theme.success(`\n✓ Request saved to collection "${collection_name}" as "${request_name}"`));
        }
        
        return {...response,request:{method,url:args?.url,header,data:args?.data}}
    } catch (error) {
        // If it's already a CliError, re-throw it
        if (error instanceof CliError) {
            throw error;
        }
        
        // Handle HTTP status errors (4xx, 5xx)
        if (error.response && error.response.meta) {
            const statusCode = error.response.meta.status;
            if (statusCode >= 400) {
                throw new CliError({
                    isKnown: true,
                    message: `HTTP Error ${statusCode}`,
                    category: "http",
                    statusCode: statusCode,
                    url: url,
                    details: {
                        statusText: error.response.meta.message,
                        body: error.response.response?.body
                    }
                });
            }
        }
        
        // Handle network/system errors
        const code = error.code;
        switch (code) {
            case "ENOTFOUND":
                throw new CliError({
                    isKnown: true,
                    message: "Could not resolve host",
                    code: code,
                    category: "dns",
                    url: url,
                    details: { hostname: urlparams?.hostname }
                });
            case "ERR_INVALID_URL":
                throw new CliError({
                    isKnown: true,
                    message: `Invalid URL format: "${url}"`,
                    code: code,
                    category: "validation",
                    url: url
                });
            case "ECONNREFUSED":
                throw new CliError({
                    isKnown: true,
                    message: "Connection refused",
                    code: code,
                    category: "network",
                    url: url,
                    details: {
                        hostname: urlparams?.hostname,
                        port: urlparams?.port || (urlparams?.protocol?.includes('https') ? 443 : 80)
                    }
                });
            case "ETIMEDOUT":
                throw new CliError({
                    isKnown: true,
                    message: "Connection timeout",
                    code: code,
                    category: "timeout",
                    url: url,
                    details: { timeout: timeout }
                });
            case "EHOSTUNREACH":
                throw new CliError({
                    isKnown: true,
                    message: "Host unreachable",
                    code: code,
                    category: "network",
                    url: url
                });
            case "ENETUNREACH":
                throw new CliError({
                    isKnown: true,
                    message: "Network unreachable",
                    code: code,
                    category: "network",
                    url: url
                });
            default:
                // For unknown errors, wrap them
                throw new CliError({
                    message: error.message || "Request failed",
                    code: code,
                    originalError: error,
                    url: url
                });
        }
    }
}
