import CliError from "../utils/Error.mjs";
import theme from "../utils/theme.mjs";
import RequestHandler from "./request.handler.mjs";
import { readRequestFile } from "../utils/fileHandle.mjs";

function isUrlLike(target = "") {
  return /^https?:\/\//i.test(target) || target.startsWith("{{");
}

function validateIdentifier(value, label) {
  if (!value || !/^[a-zA-Z0-9_\-]+$/.test(value)) {
    throw new CliError({
      isKnown: true,
      message: `Invalid ${label}: "${value}"`,
      category: "validation"
    });
  }
}

async function resolveSequenceTarget(spec = "") {
  const target = typeof spec === "string" ? spec.trim() : "";

  if (isUrlLike(target)) {
    return {
      url: target,
      method: "GET",
      header: [],
      data: undefined,
      label: target
    };
  }

  if (target.includes(":")) {
    const [collection, request] = target.split(":").map((part) => part.trim());
    validateIdentifier(collection, "collection name");
    validateIdentifier(request, "request name");
    const saved = await readRequestFile(collection, request);
    return { ...saved, label: `${collection}:${request}` };
  }

  throw new CliError({
    isKnown: true,
    message: `Invalid sequence target: "${spec}". Use collection:request or a URL.`,
    category: "validation"
  });
}

function mergeArrays(left = [], right = []) {
  return [...new Set([...(left || []), ...(right || [])])];
}

export default async function sequenceHandler(argv = {}) {
  const {
    requests = [],
    continueOnFail = false,
    runtimeScopes = {},
    timeout,
    insecure,
    redirect,
    bearer,
    basic,
    extract = [],
    assert: assertions = [],
    assertFormat = "tap",
    preScript,
    postScript
  } = argv;

  if (!Array.isArray(requests) || requests.length === 0) {
    throw new CliError({
      isKnown: true,
      message: "Sequence command requires at least one request reference",
      category: "validation"
    });
  }

  runtimeScopes.sequence = runtimeScopes.sequence || {};
  const summary = [];

  for (const spec of requests) {
    let target;
    try {
      target = await resolveSequenceTarget(spec);
    } catch (error) {
      if (!continueOnFail) throw error;
      summary.push({ spec, error: error.message });
      console.error(theme.error(`✗ ${spec}: ${error.message}`));
      continue;
    }

    const originalEnv = runtimeScopes.env || {};
    if (target.env) {
      runtimeScopes.env = { ...originalEnv, ...target.env };
    }

    try {
      const response = await RequestHandler({
        ...target,
        header: target.header || [],
        data: target.data,
        method: target.method || "GET",
        runtimeScopes,
        timeout: timeout ?? target.timeout,
        insecure: insecure ?? target.insecure,
        redirect: redirect ?? target.redirect,
        bearer: bearer || target.bearer,
        basic: basic || target.basic,
        extract: mergeArrays(target.extract, extract),
        assert: mergeArrays(target.assertions, assertions),
        assertFormat,
        preScript: target.preScript || preScript,
        postScript: target.postScript || postScript
      });

      summary.push({
        spec: target.label,
        status: response.meta.status,
        duration: response.meta.durationMs
      });
    } catch (error) {
      summary.push({ spec: target.label, error: error.message });
      console.error(theme.error(`✗ ${target.label}: ${error.message}`));
      if (!continueOnFail) {
        throw error instanceof CliError ? error : new CliError({
          message: error.message,
          originalError: error
        });
      }
    } finally {
      runtimeScopes.env = originalEnv;
    }
  }

  if (summary.length) {
    console.log(theme.info("\nSequence Summary"));
    summary.forEach((item, index) => {
      if (item.error) {
        console.log(theme.error(`${index + 1}. ${item.spec} -> ERROR (${item.error})`));
      } else {
        const duration = typeof item.duration === "number" ? `${item.duration.toFixed(2)} ms` : `${item.duration}`;
        console.log(theme.success(`${index + 1}. ${item.spec} -> ${item.status} (${duration})`));
      }
    });
  }
}
