import test from "node:test";
import assert from "node:assert/strict";
import { summarizeBenchmarks, formatBenchmarkSummary } from "../src/utils/benchmarkReporter.mjs";

test("summarizeBenchmarks calculates metrics", () => {
  const summary = summarizeBenchmarks([10, 20, 30, 40, 50]);
  assert.equal(summary.count, 5);
  assert.equal(summary.min, 10);
  assert.equal(summary.max, 50);
  assert.equal(summary.median, 30);
  assert.equal(summary.avg, 30);
});

test("formatBenchmarkSummary returns printable content", () => {
  const summary = summarizeBenchmarks([5, 10, 15]);
  const text = formatBenchmarkSummary(summary);
  assert.match(text, /Benchmark Summary/);
  assert.match(text, /Samples: 3/);
});
