

const request_yargs = (yargs)=>{
    return yargs
      .usage("Usage: 404ping <url> [options]")
      .positional("url", {
        type: "string",
        describe: "The API endpoint URL you want to request",
        demandOption: true,
      })
      .option("method", {
        alias: "X",
        type: "string",
        default: "GET",
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
      .option("connection",{
        type:"boolean",
        describe:"full socket info"
      })
      .option("tls",{
        type:"boolean",
        describe:"HTTPS cert+ cipher detail"
      })
      .option("redirect",{
        alias:"L",
        type:"boolean",
        describe:"follow redirects"
      })
      .option("timeout",{
        type:"number",
        describe:"how long to wait for the server to send data after connection is established"
      })
      .example(
        "404ping https://api.example.com/user -X POST -d '{\"name\":\"John\"}' -H 'Authorization: Bearer token'",
        "Send a POST request with JSON body and Authorization header"
      )
      .check((argv) => {
        // Validate HTTP method
        const allowed = ["GET", "POST", "PUT", "DELETE"];
        if (!allowed.includes(argv.method.toUpperCase())) {
          throw new CliError({isKnown:true,message:`Invalid HTTP method: ${argv.method}`,type:"warn"});
        }

        // Validate headers
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
      });
}

export default request_yargs;