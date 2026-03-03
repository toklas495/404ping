import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { loadEnvironment } from "../src/utils/envLoader.mjs";
import buildExecutionContext from "../src/utils/executionContext.mjs";

async function makeTempEnvDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "404ping-env-test-"));
  await fs.writeFile(path.join(tempDir, ".env"), "BASE_URL=https://base.example\nSHARED=from_base\n", "utf-8");
  await fs.writeFile(path.join(tempDir, ".env.staging"), "BASE_URL=https://staging.example\nSTAGE_FLAG=true\n", "utf-8");
  await fs.writeFile(path.join(tempDir, "custom.env"), "CUSTOM_FLAG=custom\nSHARED=from_custom\n", "utf-8");
  return tempDir;
}

test("loadEnvironment merges .env, profile, and env-file", async () => {
  const fixturesDir = await makeTempEnvDir();
  const env = await loadEnvironment({
    cwd: fixturesDir,
    profile: "staging",
    envFile: "custom.env",
    includeProcessEnv: false
  });

  assert.equal(env.BASE_URL, "https://staging.example");
  assert.equal(env.STAGE_FLAG, "true");
  assert.equal(env.CUSTOM_FLAG, "custom");
  assert.equal(env.SHARED, "from_custom");
});

test("buildExecutionContext returns expected structure", async () => {
  const fixturesDir = await makeTempEnvDir();
  const ctx = await buildExecutionContext({ envProfile: "staging", envFile: "fixtures/custom.env" });
  assert.ok(ctx.env);
  assert.ok(ctx.vars);
  assert.ok(ctx.runtime);
  assert.deepEqual(ctx.sequence, {});
  assert.deepEqual(ctx.filter, {});

  const env = await loadEnvironment({ cwd: fixturesDir, profile: "staging", envFile: "custom.env", includeProcessEnv: false });
  assert.equal(env.BASE_URL, "https://staging.example");
});
