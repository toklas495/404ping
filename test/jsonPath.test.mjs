import test from "node:test";
import assert from "node:assert/strict";
import { evaluateJsonPath, ensureArray, pathExists } from "../src/utils/jsonPath.mjs";

test("evaluateJsonPath resolves nested fields and arrays", () => {
  const payload = { users: [{ id: 1 }, { id: 2 }], meta: { ok: true } };
  assert.equal(evaluateJsonPath(payload, "json.meta.ok"), true);
  assert.equal(evaluateJsonPath(payload, "json.users[1].id"), 2);
  assert.deepEqual(evaluateJsonPath(payload, "json.users[].id"), [1, 2]);
});

test("ensureArray and pathExists work as expected", () => {
  assert.deepEqual(ensureArray(null), []);
  assert.deepEqual(ensureArray("x"), ["x"]);
  assert.equal(pathExists({ a: { b: 1 } }, "json.a.b"), true);
  assert.equal(pathExists({ a: {} }, "json.a.b"), false);
});
