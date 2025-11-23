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
                    const ms = performance.now()-start;
                    const duration = ms<1000?`${ms.toFixed(2)}ms`:`${(ms/1000).toFixed(2)}s`
                    const raw = Buffer.concat(data);
                    const body = raw.toString();
                    //try to parse json automatically
                    let parsedJson = null;
                    try{
                        parsedJson = JSON.parse(body);
                    }catch{};
                    resolve({
                        status:res.statusCode,
                        message:res.statusMessage,
                        httpVersion:res.httpVersion,
                        rawHeaders:res.rawHeaders,
                        headers:res.headers,
                        body,
                        json:parsedJson,
                        duration,
                        size:{
                            bodyBytes:raw.length,
                            headersBytes:Buffer.byteLength(JSON.stringify(res.headers)),
                            totalBytes:raw.length+Buffer.byteLength(JSON.stringify(res.headers))
                        },
                        request:{
                            method:this.options.method,
                            url:this.options.path,
                            headers:this.options.headers,
                            payload:this.payload
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