import vm from "vm";
import CliError from "./Error.mjs";

const DEFAULT_TIMEOUT = 5000;

export async function runHook(code, context = {}, { label = "hook", timeout = DEFAULT_TIMEOUT } = {}) {
  if (!code) return null;
  const wrapped = `(async (__ctx__) => {\n${code}\n})(__ctx__)`;
  const sandbox = vm.createContext({
    console,
    Buffer,
    Date,
    Math,
    __ctx__: context
  });
  try {
    const script = new vm.Script(wrapped, { filename: `${label}.mjs` });
    return await script.runInContext(sandbox, { timeout });
  } catch (error) {
    throw new CliError({
      isKnown: true,
      message: `${label} execution failed: ${error.message}`,
      category: "script",
      originalError: error
    });
  }
}

export function buildHookContext({
  request,
  response,
  runtimeScopes,
  setRuntimeVar
}) {
  return {
    request,
    response,
    env: runtimeScopes?.env || {},
    vars: runtimeScopes || {},
    setVar: setRuntimeVar
  };
}

export default runHook;
