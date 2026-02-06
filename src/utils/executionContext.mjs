import loadEnvironment from "./envLoader.mjs";
import { readFile as readVarFile } from "./fileHandle.mjs";
import CliError from "./Error.mjs";

function deepMerge(base = {}, patch = {}) {
  const result = { ...base };
  Object.keys(patch).forEach((key) => {
    if (patch[key] && typeof patch[key] === "object" && !Array.isArray(patch[key])) {
      result[key] = deepMerge(base[key] || {}, patch[key]);
    } else {
      result[key] = patch[key];
    }
  });
  return result;
}

export async function buildExecutionContext({ envProfile, envFile } = {}) {
  const envVars = await loadEnvironment({ profile: envProfile, envFile });
  let variableFileContent = await readVarFile();
  let variables;
  try {
    variables = JSON.parse(variableFileContent);
  } catch (error) {
    throw new CliError({
      isKnown: true,
      message: "Variable file contains invalid JSON",
      category: "file",
      originalError: error
    });
  }

  return {
    env: envVars,
    vars: variables,
    runtime: deepMerge({}, variables),
    sequence: {},
    filter: {}
  };
}

export default buildExecutionContext;
