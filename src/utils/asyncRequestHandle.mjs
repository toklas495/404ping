class Request{
    constructor(httpModule){
        //http request
        this.http = httpModule;
        this.options = {};
        this.payload = null;
    }
    addHost(host){
        this.options.host = host;
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

    async send(){
        return new Promise((resolve,reject)=>{
            const start = performance.now();
            
            const req = this.http.request(this.options,(res)=>{
                let data = [];
                res.on('data',(chunk)=>{
                    data.push(chunk);
                })

                res.on("end",()=>{
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
                                headersBytes:Buffer.byteLength(JSON.stringify(res.headers)),
                                totalBytes:raw.length+Buffer.byteLength(JSON.stringify(res.headers))
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
                        tls:socket?.getPeerCerticate?{
                            authorized:socket.authorized,
                            authorizationError:socket.authorizationError||null,
                            protocol:socket.getProtocol?.()||null,
                            cipher:socket.getCipher?.()||null,
                            certificate:socket.getPeerCerticate?.()||null
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
                            host:this.options.host
                        }
                    })
                });
            })
            req.on("error",reject);
            if(this.payload) req.write(this.payload);

            req.end()
        })
    }

}


export default Request;