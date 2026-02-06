import CliError from "../utils/Error.mjs";

const postmanArgs = (yargs) =>
  yargs
    .usage("Usage: 404ping postman <import|export> [options]")
    .positional("action", {
      describe: "Action to perform",
      type: "string",
      choices: ["import", "export"]
    })
    .option("input", {
      alias: "i",
      type: "string",
      describe: "Postman collection JSON to import"
    })
    .option("collection", {
      alias: "c",
      type: "string",
      describe: "Collection name"
    })
    .option("output", {
      alias: "o",
      type: "string",
      describe: "Export file path"
    })
    .check((argv) => {
      if (argv.action === "import" && !argv.input) {
        throw new CliError({
          isKnown: true,
          message: "Import requires --input",
          category: "validation"
        });
      }
      if (argv.action === "export" && !argv.collection) {
        throw new CliError({
          isKnown: true,
          message: "Export requires --collection",
          category: "validation"
        });
      }
      return true;
    });

export default postmanArgs;
