import CliError from "./Error.mjs";

class Request{
    constructor(httpModule, options = {}){
        //http request
        this.http = httpModule;
        this.agent = new this.http.Agent({
            keepAlive:true,
            maxSockets:100,
            maxFreeSockets:10,
            timeout:60000,  // idle socket timeout
            keepAliveMsecs:5000// send tcp keep alive every 5 second
        })
        // SECURITY: rejectUnauthorized defaults to true (secure by default)
        // Users can explicitly disable with --insecure flag if needed
        this.options = {
            agent: this.agent,
            rejectUnauthorized: options.rejectUnauthorized !== false // Default to true for security
        };
        this.payload = null;
        this.timeout = 0;//default 
        this.insecure = options.insecure || false;
    }
    addHost(host){
        this.options.hostname = host;
        return this;
    }

    addCert(){
        this.options["rejectUnauthorized"] = true;
        this.insecure = false;
        return this;
    }

    setInsecure(insecure = false){
        this.insecure = insecure;
        this.options["rejectUnauthorized"] = !insecure;
        return this;
    }

    addPort(port){
        this.options.port = port;
        return this;
    }

    addMethod(method="GET"){
        this.options.method=method.toUpperCase();
        return this;
    }

    addPath(path="/"){
        this.options.path=path;
        return this;
    }

    addHeaders(headers={}){
        this.options["headers"] = headers;
        return this;
    }

    addBody(body={}){
        this.payload = JSON.stringify(body);

        this.options.headers = this.options.headers||{};
        this.options.headers["Content-Type"] = "application/json";
        this.options.headers["Content-Length"] = Buffer.byteLength(this.payload);
        return this;
    }

    addTimeout(timeout){
        this.timeout = timeout;
        return this;
    }
    async send(){
        return new Promise((resolve,reject)=>{
            const start = performance.now();
            const timeoutMs = this.timeout;
            const req = this.http.request(this.options,(res)=>{
                let data = [];
                res.on('data',(chunk)=>{
                    data.push(chunk);
                })

                res.on("end",()=>{
                    clearTimeout(timeoutTimer);
                    const end  = performance.now();
                    const ms = end-start;
                    const duration = ms<1000?`${ms.toFixed(2)}ms`:`${(ms/1000).toFixed(2)}s`
                    const raw = Buffer.concat(data);
                    const body = raw.toString();
                    //try to parse json automatically
                    let parsedJson = null;
                    try{
                        parsedJson = JSON.parse(body);
                    }catch{};

                    // socket reference
                    const socket = res?.socket||res?.client||null;

                    resolve({
                        meta:{
                            status:res.statusCode,
                            message:res.statusMessage,
                            httpVersion:res.httpVersion,
                            durationMs:ms,
                            timestamp:Date.now()
                        },
                        response:{
                            headers:res.headers,
                            rawHeaders:res.rawHeaders,
                            body,
                            json:parsedJson||null,
                            size:{
                                bodyBytes:raw.length,
                                headersBytes:res.rawHeaders.reduce((a,h)=>a+Buffer.byteLength(h),0),
                                totalBytes:raw.length+res.rawHeaders.reduce((a,h)=>a+Buffer.byteLength(h),0)
                            }
                        },
                        duration,
                        // . CONNECTION LEVEL INFORMATION
                        connection:socket?{
                            localAddress:socket.localAddress||null,
                            localPort:socket.localPort||null,
                            remoteAddress:socket.remoteAddress||null,
                            remotePort:socket.remotePort||null,
                            reused:socket.reusedSocket||false, // Node set this for keep alive
                            bytesRead:socket.bytesRead||null,
                            bytesWritten:socket.bytesWritten||null
                        }:null,

                        //TLS DETAIL (only for https, else null)
                        tls:(socket&& typeof socket.getPeerCertificate==="function")?{
                            authorized:socket.authorized,
                            authorizationError:socket.authorizationError||null,
                            protocol:socket.getProtocol?.()||null,
                            cipher:socket.getCipher?.()||null,
                            certificate:socket.getPeerCertificate?.()||null
                        }:null,
                        timing:{
                            startTime:start,
                            endTime:end,
                            totalMs:ms
                        },
                        // REQUEST INFO
                        request:{
                            method:this.options.method,
                            url:this.options.path,
                            headers:this.options.headers,
                            payload:this.payload,
                            host:this.options.hostname
                        }
                    })
                });
            })

            // ------------------------------------------
            //TIMEOUT HANDLING (IMPORTANT)
            //------------------------------------------
            let timeoutTimer = null;
            if(timeoutMs>0){
                timeoutTimer = setTimeout(()=>{
                    req.destroy(); // abort socket;
                    reject(new CliError({isKnown:true,message:`Request Timeout after ${timeoutMs}`}));
                },timeoutMs);
            };

            req.on("error",(err)=>{
                clearTimeout(timeoutTimer);
                
                // Handle SSL/TLS errors specifically
                if (err.code && (err.code.includes("CERT") || err.code.includes("SSL") || 
                    err.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || 
                    err.code === "SELF_SIGNED_CERT_IN_CHAIN" ||
                    err.code === "DEPTH_ZERO_SELF_SIGNED_CERT")) {
                    reject(new CliError({
                        isKnown: true,
                        message: `SSL certificate verification failed: ${err.message}`,
                        code: err.code,
                        category: "ssl",
                        originalError: err,
                        details: {
                            suggestion: "Use --insecure flag to bypass certificate verification (not recommended)"
                        }
                    }));
                    return;
                }
                
                reject(err);
            });
            if(this.payload) req.write(this.payload);

            req.end()
        })
    }

}


export default Request;