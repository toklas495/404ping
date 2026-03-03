import test from "node:test";
import assert from "node:assert/strict";
import extractValues from "../src/utils/extractionEngine.mjs";

const response = {
  meta: { status: 201, durationMs: 88 },
  response: {
    headers: { "x-trace-id": "trace-1" },
    body: JSON.stringify({ auth: { token: "tok" } }),
    json: { auth: { token: "tok" } }
  }
};

test("extractValues extracts supported sources", () => {
  const result = extractValues(response, [
    "token=json.auth.token",
    "trace=header.x-trace-id",
    "code=status",
    "t=duration"
  ]);

  assert.deepEqual(result.extracted, {
    token: "tok",
    trace: "trace-1",
    code: 201,
    t: 88
  });
  assert.equal(result.printed.length, 4);
});

test("extractValues can read from filter result", () => {
  const result = extractValues(response, ["user=filter.name"], { filterResult: { name: "neo" } });
  assert.equal(result.extracted.user, "neo");
});
