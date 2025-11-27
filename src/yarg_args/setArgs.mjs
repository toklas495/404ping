import CliError from "../utils/Error.mjs";

const setArgs = (yargs)=>{
     return yargs
      .usage("Usage: 404ping set <variables> [options]")
      .positional("variables", {
        type: "array",
        describe:
          "Variables to set in 'key:value' format. Example: host:google.com token:abc123",
        demandOption: true,
      })
      .option("global", {
        alias: "g",
        type: "boolean",
        describe:
          "Save variables globally to variable.json so they can be used in requests with {{variable}} placeholders",
      })
      .example(
        "404ping set host:google.com token:abc123 -g",
        "Set host and token globally"
      )
      .check((argv) => {
        argv.variables.forEach((v) => {
          if (!v.includes(":")) {
            throw new CliError({
              isKnown:true,message:`Invalid variable format: "${v}". Must be "key:value"`,type:"warn"
          });
          }
          const [key, value] = v.split(":").map((s) => s.trim());
          if (!key || !value) {
            throw new CliError({
             isKnown:true,message:`Invalid variable: "${v}". Key and Value cannot be empty`,type:"warn"
          });
          }
        });
        return true;
      });
}

export default setArgs;