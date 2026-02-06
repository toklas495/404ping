import fs from "fs/promises";
import path from "path";
import resolveHome from "./resolvePath.mjs";
import CliError from "./Error.mjs";

export async function loadScriptSource(input) {
  if (!input) return null;
  if (typeof input !== "string") {
    throw new CliError({
      isKnown: true,
      message: "Script input must be a string",
      category: "validation"
    });
  }

  if (!input.startsWith("@")) {
    return input;
  }

  const relativePath = input.slice(1).trim();
  if (!relativePath) {
    throw new CliError({
      isKnown: true,
      message: "Invalid script argument. Use @/path/to/script.js",
      category: "validation"
    });
  }

  const absolutePath = path.resolve(process.cwd(), resolveHome(relativePath));
  try {
    return await fs.readFile(absolutePath, "utf-8");
  } catch (error) {
    throw new CliError({
      isKnown: true,
      message: `Unable to read script file: ${absolutePath}`,
      category: "file",
      code: error.code,
      details: { path: absolutePath }
    });
  }
}

export default loadScriptSource;
