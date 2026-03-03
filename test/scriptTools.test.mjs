import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { runHook, buildHookContext } from "../src/utils/scriptRunner.mjs";
import loadScriptSource from "../src/utils/scriptSource.mjs";

test("runHook executes code and mutates context", async () => {
  const runtimeScopes = { runtime: {}, env: {} };
  const ctx = buildHookContext({
    request: { headers: {} },
    response: { meta: { status: 200 } },
    runtimeScopes,
    setRuntimeVar: (scope, key, value) => {
      runtimeScopes[scope] = runtimeScopes[scope] || {};
      runtimeScopes[scope][key] = value;
    }
  });

  await runHook("__ctx__.setVar('runtime', 'token', 'abc'); __ctx__.request.headers['X-Test']='yes';", ctx, { label: "test-hook" });
  assert.equal(runtimeScopes.runtime.token, "abc");
  assert.equal(ctx.request.headers["X-Test"], "yes");
});

test("loadScriptSource reads @file script content", async () => {
  const scriptPath = path.resolve(process.cwd(), "test/fixtures/scripts/hook.js");
  const source = await loadScriptSource(`@${scriptPath}`);
  assert.match(source, /setVar/);
});

test("loadScriptSource returns inline script unchanged", async () => {
  const inline = "console.log('ok')";
  const source = await loadScriptSource(inline);
  assert.equal(source, inline);
});
