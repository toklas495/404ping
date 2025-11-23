// import runFromCollectionHandler from "../handler/runFromCollection.handler.mjs";

import CliError from "../utils/Error.mjs"


const runFromCollectionYargs = (yargs)=>{
    return yargs.usage("Usage: 404ping run <option>")
    .positional("collection_request",{
        describe:"Format:  collection:request",
        type:"string"
    })
    .option("url",{
        alias:"u",
        type:"string",
        describe:
            "target url"
    })
    .option("method", {
        alias: "X",
        type: "string",
        describe:
          "HTTP method to use. Allowed: GET, POST, PUT, DELETE. Default: GET",
      })
      .option("data", {
        alias: "d",
        type: "string",
        describe:
          "Request body in JSON format (use with POST or PUT). Example: '{\"key\":\"value\"}'",
      })
      .option("header", {
        alias: "H",
        type: "array",
        describe:
          "Custom headers. Use multiple -H options or an array. Format: 'Key: Value'. Example: -H 'Authorization: Bearer token'",
      })
      .option("s_header",{
        alias:"i",
        type:"boolean",
        describe:"Show response headers in output"
      })
      .option("size",{
        type:"boolean",
        describe:"Show response byte-size"
      })
      .option("raw",{
        type:"boolean",
        describe:"raw body"
      })
      .option("info",{
        type:"boolean",
        describe:"summary"
      })
      .option("debug",{
        type:"boolean",
        describe:"full dump"
      })
      .option("save",{
        type:"boolean",
        describe:"save as <request>"
      })
    .check((argv)=>{
        if(
            !argv.collection_request||
            typeof(argv.collection_request)!=="string"||
            !argv.collection_request.includes(":")
        ) throw new CliError({isKnown:true,message:"Invalid <collection_request>",type:"warn"});

        const [key,value] = argv.collection_request.split(":").map(v=>v.trim());
        if(!key||!value) throw new CliError({isKnown:true,message:"Invalid \"collection:request\". format: <collection_name:request_name>"})
        
        if (argv.header) {
          argv.header.forEach((h) => {
            if (!h.includes(":")) {
              throw new CliError({
                isKnown:true,message:`Invalid header format: "${h}". Must be "Key: Value"`,type:"warn"
            });
            }
            const [key, value] = h.split(":").map((s) => s.trim());
            if (!key || !value) {
              throw new CliError({
                isKnown:true,message:`Invalid header: "${h}". Key and Value cannot be empty`,type:"warn"
            });
            }
          });
        }
        
        return true;
    })
}

export default runFromCollectionYargs;