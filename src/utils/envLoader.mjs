import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import resolveHome from "./resolvePath.mjs";

const DEFAULT_ENV_FILES = [".env"];
const PROFILE_DIRECTORIES = ["env", "environments", "config/env"];
const HOME_ENV_DIR = "~/.config/404ping/env";

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadSingleEnv(filePath) {
  const buffer = await fs.readFile(filePath, "utf-8");
  return dotenv.parse(buffer);
}

function resolveCandidate(baseDir, candidate) {
  if (!candidate) return null;
  if (candidate.startsWith("/")) return candidate;
  if (candidate.startsWith("~")) return resolveHome(candidate);
  return path.resolve(baseDir, candidate);
}

export async function loadEnvironment({
  profile = null,
  envFile = null,
  cwd = process.cwd(),
  includeProcessEnv = true
} = {}) {
  const envData = {};
  const candidates = new Set();

  DEFAULT_ENV_FILES.forEach((file) => candidates.add(resolveCandidate(cwd, file)));

  if (envFile) {
    candidates.add(resolveCandidate(cwd, envFile));
  }

  if (profile) {
    candidates.add(resolveCandidate(cwd, `.env.${profile}`));
    PROFILE_DIRECTORIES.forEach((dir) => {
      candidates.add(resolveCandidate(cwd, `${dir}/${profile}.env`));
    });
    candidates.add(resolveCandidate(cwd, `${HOME_ENV_DIR}/${profile}.env`));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = resolveCandidate(cwd, candidate);
    if (!resolved) continue;
    if (await fileExists(resolved)) {
      const parsed = await loadSingleEnv(resolved);
      Object.assign(envData, parsed);
    }
  }

  if (includeProcessEnv) {
    Object.assign(envData, process.env);
  }

  return envData;
}

export default loadEnvironment;
