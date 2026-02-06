import CliError from "../utils/Error.mjs";

function validateSpec(spec) {
  if (typeof spec !== "string" || !spec.trim()) {
    throw new CliError({
      isKnown: true,
      message: "Sequence targets must be strings",
      category: "validation"
    });
  }
}

const sequenceArgs = (yargs) =>
  yargs
    .usage("Usage: 404ping sequence <target...> [options]")
    .positional("targets", {
      describe: "List of requests to run in order (collection:request or URL)",
      type: "string"
    })
    .option("continue-on-fail", {
      alias: "c",
      type: "boolean",
      describe: "Continue running sequence even if a request fails"
    })
    .option("timeout", {
      type: "number",
      describe: "Override request timeout for all steps"
    })
    .option("insecure", {
      alias: "k",
      type: "boolean",
      describe: "Allow insecure SSL connections"
    })
    .option("redirect", {
      alias: "L",
      type: "boolean",
      describe: "Follow redirects for each request"
    })
    .option("bearer", {
      type: "string",
      describe: "Bearer token used across the sequence"
    })
    .option("basic", {
      type: "string",
      describe: "Basic auth credentials user:pass"
    })
    .option("extract", {
      type: "array",
      describe: "Extraction rules applied after each request"
    })
    .option("assert", {
      type: "array",
      describe: "Assertions applied to each response"
    })
    .option("assert-format", {
      choices: ["tap", "junit"],
      default: "tap",
      describe: "Assertion output format"
    })
    .check((argv) => {
      const targets = argv._.slice(1);
      if (!targets.length) {
        throw new CliError({
          isKnown: true,
          message: "sequence command requires at least one target",
          category: "validation"
        });
      }
      targets.forEach(validateSpec);
      return true;
    });

export default sequenceArgs;
