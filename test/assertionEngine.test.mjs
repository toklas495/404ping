import test from "node:test";
import assert from "node:assert/strict";
import runAssertions from "../src/utils/assertionEngine.mjs";

function sampleResponse() {
  return {
    meta: { status: 200, durationMs: 120 },
    response: {
      headers: { "content-type": "application/json", "x-trace-id": "abc" },
      body: JSON.stringify({ user: { id: 42, name: "neo" }, tags: ["api", "cli"] }),
      json: { user: { id: 42, name: "neo" }, tags: ["api", "cli"] }
    }
  };
}

test("runAssertions passes for valid rules", () => {
  const result = runAssertions(sampleResponse(), [
    "status=200",
    "duration<500",
    "json.user.id=42"
  ]);
  assert.equal(result.passed, true);
  assert.match(result.output, /TAP version 13/);
});

test("runAssertions fails and reports messages", () => {
  const result = runAssertions(sampleResponse(), ["status=201"]);
  assert.equal(result.passed, false);
  assert.equal(result.results[0].pass, false);
  assert.match(result.results[0].message, /Expected status/);
});

test("runAssertions supports junit output", () => {
  const result = runAssertions(sampleResponse(), ["status=200"], "junit");
  assert.match(result.output, /<testsuite/);
  assert.match(result.output, /<testcase/);
});
