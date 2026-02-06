#!/usr/bin/env node
import { Command } from "commander";
import { createRequire } from "node:module";
import builder from "./src/build.mjs";
import CliError from "./src/utils/Error.mjs";
import errorHandler from "./src/utils/errorHandler.mjs";
import buildExecutionContext from "./src/utils/executionContext.mjs";
import loadScriptSource from "./src/utils/scriptSource.mjs";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

await builder.init();

/**
 * Example invocations:
 *   404ping https://api.dev/login -X POST -d '{"user":"neo","pass":"red"}' --assert status=200
 *   404ping sequence auth:login users:list --extract token=json.token --assert 'json.total>0'
 */

const program = new Command();

program
  .name("404ping")
  .description("Lightweight API testing CLI — curl with brains (fast, secure, scriptable).")
  .version(pkg.version)
  .option("--env <profile>", "Load variables from .env.<profile> or environments/PROFILE.env")
  .option("--env-file <path>", "Load an additional .env file before profiles");

const collect = (value, previous = []) => {
  if (typeof value === "string" && value.trim().length) {
    previous.push(value.trim());
  }
  return previous;
};

const runtimeCache = new Map();
const cloneContext = (context) => {
  if (!context) return context;
  if (typeof structuredClone === "function") {
    return structuredClone(context);
  }
  return JSON.parse(JSON.stringify(context));
};

async function getRuntimeContext(command) {
  const globals = command?.optsWithGlobals ? command.optsWithGlobals() : command.opts();
  const key = `${globals.env || ""}|${globals.envFile || ""}`;
  if (!runtimeCache.has(key)) {
    const ctx = await buildExecutionContext({
      envProfile: globals.env,
      envFile: globals.envFile
    });
    runtimeCache.set(key, ctx);
  }
  return cloneContext(runtimeCache.get(key));
}

async function resolveScriptInput(value) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith("@")) {
    return loadScriptSource(trimmed);
  }
  return trimmed;
}

function normalizeNumberOption(raw, label) {
  if (raw === undefined || raw === null) return undefined;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new CliError({
      isKnown: true,
      message: `Invalid ${label}: ${raw}`,
      category: "validation",
      type: "warn"
    });
  }
  return parsed;
}

function normalizeBenchmark(value) {
  if (value === undefined) return undefined;
  if (value === true) return true;
  return normalizeNumberOption(value, "--benchmark value");
}

function attachRequestFlags(cmd, { allowSave = true, includeUrlOverride = false } = {}) {
  cmd
    .option("-X, --method <method>", "HTTP method", "GET")
    .option("-d, --data <body>", "Request body payload (JSON or string)")
    .option("-H, --header <header>", "Custom header 'Key: Value'", collect, [])
    .option("-i, --show-headers", "Show response headers")
    .option("--size", "Show size summary")
    .option("--info", "Show request summary block")
    .option("--raw", "Print raw response body")
    .option("--debug", "Print full debug dump")
    .option("--connection", "Show connection diagnostics")
    .option("--tls", "Show TLS certificate details")
    .option("-L, --redirect", "Follow redirects")
    .option("-k, --insecure", "Allow insecure TLS (not recommended)")
    .option("--timeout <ms>", "Timeout in milliseconds")
    .option("--filter <expression>", "jq-like JSON filter applied to body")
    .option("--extract <rule>", "Extraction rule name=source", collect, [])
    .option("--assert <rule>", "Assertion rule path comparator value", collect, [])
    .option("--assert-format <format>", "Assertion output format (tap|junit)", "tap")
    .option("--benchmark [runs]", "Benchmark by repeating the request")
    .option("--bearer <token>", "Attach Authorization: Bearer token")
    .option("--basic <user:pass>", "Attach Basic auth header")
    .option("--pre-script <script>", "JS snippet/file run before the request")
    .option("--post-script <script>", "JS snippet/file run after the request");

  if (allowSave) {
    cmd.option("--save <collection.request>", "Save request into collection");
  }

  if (includeUrlOverride) {
    cmd.option("--url <url>", "Override stored URL before running");
  }

  return cmd;
}

async function buildRequestArgs({ url, options, runtimeScopes }) {
  const timeout = options.timeout !== undefined ? normalizeNumberOption(options.timeout, "--timeout value") : undefined;
  const benchmark = normalizeBenchmark(options.benchmark);
  const assertFormat = (options.assertFormat || "tap").toLowerCase();

  return {
    url,
    method: options.method || "GET",
    data: options.data,
    header: options.header || [],
    s_header: Boolean(options.showHeaders),
    size: Boolean(options.size),
    info: Boolean(options.info),
    raw: Boolean(options.raw),
    debug: Boolean(options.debug),
    connection: Boolean(options.connection),
    tls: Boolean(options.tls),
    redirect: Boolean(options.redirect),
    timeout,
    insecure: Boolean(options.insecure),
    save: options.save,
    filter: options.filter,
    extract: options.extract || [],
    assert: options.assert || [],
    assertFormat,
    benchmark,
    bearer: options.bearer,
    basic: options.basic,
    preScript: await resolveScriptInput(options.preScript),
    postScript: await resolveScriptInput(options.postScript),
    runtimeScopes
  };
}

async function runRequest(url, options, command) {
  if (!url) {
    throw new CliError({
      isKnown: true,
      message: "URL is required",
      category: "validation",
      type: "warn"
    });
  }

  const runtimeScopes = await getRuntimeContext(command);
  const requestArgs = await buildRequestArgs({ url, options, runtimeScopes });
  await builder.requestHandler(requestArgs);
}

function configureRequestCommand(cmd, { optionalUrl = false } = {}) {
  if (optionalUrl) {
    cmd.argument("[url]", "Target URL or @file reference");
  } else {
    cmd.argument("<url>", "Target URL or @file reference");
  }
  attachRequestFlags(cmd, { allowSave: true });
  return cmd;
}

configureRequestCommand(program, { optionalUrl: true }).action(async (url, options, command) => {
  try {
    if (!url) {
      const banner = await import("./src/utils/banner.mjs");
      banner.default();
      program.outputHelp();
      return;
    }
    await runRequest(url, options, command);
  } catch (error) {
    errorHandler(error);
  }
});

configureRequestCommand(program.command("request").description("Send an HTTP request"), { optionalUrl: false }).action(async (url, options, command) => {
  try {
    await runRequest(url, options, command);
  } catch (error) {
    errorHandler(error);
  }
});

program
  .command("vars")
  .description("List all saved variables")
  .action(async () => {
    try {
      await builder.listVariableHandler({});
    } catch (error) {
      errorHandler(error);
    }
  });

program
  .command("set")
  .description("Set variables: key:value or scope.key:value")
  .argument("<variables...>", "Variables to set")
  .action(async (variables) => {
    try {
      await builder.setVariableHandler({ variables });
    } catch (error) {
      errorHandler(error);
    }
  });

program
  .command("unset")
  .description("Unset variables by name or scope.name")
  .argument("<variables...>", "Variables to remove")
  .action(async (variables) => {
    try {
      await builder.unSetVariableHandler({ variables });
    } catch (error) {
      errorHandler(error);
    }
  });

const collection = program.command("collection").description("Manage request collections");

collection
  .command("create <name>")
  .description("Create a new collection")
  .action(async (name) => {
    try {
      await builder.collectionHandler({ action: "create", name });
    } catch (error) {
      errorHandler(error);
    }
  });

collection
  .command("list")
  .description("List all collections")
  .action(async () => {
    try {
      await builder.collectionHandler({ action: "list" });
    } catch (error) {
      errorHandler(error);
    }
  });

collection
  .command("show <name>")
  .description("Show collection details")
  .action(async (name) => {
    try {
      await builder.collectionHandler({ action: "show", name });
    } catch (error) {
      errorHandler(error);
    }
  });

const saveCollectionCmd = collection
  .command("save <name> <request> <url>")
  .description("Send and save a request into the collection");

attachRequestFlags(saveCollectionCmd, { allowSave: false });

saveCollectionCmd
  .option("--env-var <pair>", "Inline env override key=value", collect, [])
  .action(async (name, request, url, options, command) => {
    try {
      const runtimeScopes = await getRuntimeContext(command);
      const requestArgs = await buildRequestArgs({ url, options, runtimeScopes });
      const inlineEnv = {};
      (options.envVar || []).forEach((pair) => {
        const [key, ...rest] = pair.split("=");
        if (!key || !rest.length) {
          throw new CliError({
            isKnown: true,
            message: `Invalid --env-var format: ${pair}`,
            category: "validation",
            type: "warn"
          });
        }
        inlineEnv[key.trim()] = rest.join("=").trim();
      });

      await builder.collectionHandler(
        {
          action: "save",
          name,
          request,
          env: inlineEnv,
          ...requestArgs
        },
        runtimeScopes
      );
    } catch (error) {
      errorHandler(error);
    }
  });

const runCmd = program
  .command("run")
  .description("Run a saved request from collection:request")
  .argument("<collectionRequest>", "Format collection:request");

attachRequestFlags(runCmd, { includeUrlOverride: true });

runCmd.action(async (collectionRequest, options, command) => {
  try {
    const runtimeScopes = await getRuntimeContext(command);
    const overrides = await buildRequestArgs({ url: options.url, options, runtimeScopes });
    await builder.runRequestFromCollection({
      collection_request: collectionRequest,
      ...overrides
    }, runtimeScopes);
  } catch (error) {
    errorHandler(error);
  }
});

const sequenceCmd = program
  .command("sequence")
  .description("Run requests sequentially with shared variables")
  .argument("<targets...>", "Targets: collection:request or URL")
  .option("-c, --continue-on-fail", "Do not stop on failure")
  .option("--extract <rule>", "Extraction rules", collect, [])
  .option("--assert <rule>", "Assertion rules", collect, [])
  .option("--assert-format <format>", "Assertion output format", "tap")
  .option("--timeout <ms>", "Timeout override for each request")
  .option("-k, --insecure", "Allow insecure TLS")
  .option("-L, --redirect", "Follow redirects")
  .option("--bearer <token>", "Bearer token shared across steps")
  .option("--basic <user:pass>", "Basic auth shared across steps")
  .option("--pre-script <script>", "JS hook before each request")
  .option("--post-script <script>", "JS hook after each request");

sequenceCmd.action(async (targets, options, command) => {
  try {
    const runtimeScopes = await getRuntimeContext(command);
    await builder.sequenceHandler(
      {
        requests: targets,
        continueOnFail: Boolean(options.continueOnFail),
        runtimeScopes,
        timeout: options.timeout !== undefined ? normalizeNumberOption(options.timeout, "--timeout value") : undefined,
        insecure: Boolean(options.insecure),
        redirect: Boolean(options.redirect),
        bearer: options.bearer,
        basic: options.basic,
        extract: options.extract || [],
        assert: options.assert || [],
        assertFormat: (options.assertFormat || "tap").toLowerCase(),
        preScript: await resolveScriptInput(options.preScript),
        postScript: await resolveScriptInput(options.postScript)
      },
      runtimeScopes
    );
  } catch (error) {
    errorHandler(error);
  }
});

const postman = program.command("postman").description("Import/export Postman collections");

postman
  .command("import <file>")
  .description("Import Postman collection v2.1 JSON into 404ping")
  .option("-c, --collection <name>", "Target collection name override")
  .action(async (input, options) => {
    try {
      await builder.postmanImport({ input, collection: options.collection });
    } catch (error) {
      errorHandler(error);
    }
  });

postman
  .command("export <collection>")
  .description("Export a collection as Postman v2.1 JSON")
  .option("-o, --output <file>", "Output file path (default: <collection>.postman.json)")
  .action(async (collectionName, options) => {
    try {
      await builder.postmanExport({ collection: collectionName, output: options.output });
    } catch (error) {
      errorHandler(error);
    }
  });

program.addHelpText("after", `\nExamples:\n  $ 404ping https://api.dev/users --info --assert status=200\n  $ 404ping request https://httpbin.org/get -H 'Accept: application/json'\n  $ 404ping run demo:login --assert status=200 --extract token=json.token\n  $ 404ping sequence auth:login users:list --bearer {{runtime.token}}\n`);

program.parseAsync(process.argv).catch((error) => {
  errorHandler(error);
});
