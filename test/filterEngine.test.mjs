import test from "node:test";
import assert from "node:assert/strict";
import runFilter from "../src/utils/filterEngine.mjs";

const payload = {
  users: [
    { id: 1, profile: { name: "neo" } },
    { id: 2, profile: { name: "trinity" } }
  ],
  meta: { total: 2 }
};

test("runFilter can select path", () => {
  assert.equal(runFilter(payload, "json.meta.total"), 2);
});

test("runFilter can project arrays", () => {
  const result = runFilter(payload, "json.users | {id: .id, name: .profile.name}");
  assert.deepEqual(result, [
    { id: 1, name: "neo" },
    { id: 2, name: "trinity" }
  ]);
});
