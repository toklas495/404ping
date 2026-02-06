function percentile(values, percentileValue) {
  if (!values.length) return 0;
  const rank = Math.ceil((percentileValue / 100) * values.length) - 1;
  return values[Math.min(Math.max(rank, 0), values.length - 1)];
}

export function summarizeBenchmarks(samples = []) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const total = samples.reduce((acc, value) => acc + value, 0);
  const avg = total / samples.length;
  return {
    count: samples.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    avg
  };
}

export function formatBenchmarkSummary(summary) {
  if (!summary) return "";
  const toMs = (value) => `${value.toFixed(2)} ms`;
  return [
    "Benchmark Summary:",
    `  Samples: ${summary.count}`,
    `  Min:     ${toMs(summary.min)}`,
    `  Max:     ${toMs(summary.max)}`,
    `  Median:  ${toMs(summary.median)}`,
    `  Avg:     ${toMs(summary.avg)}`,
    `  P90:     ${toMs(summary.p90)}`,
    `  P95:     ${toMs(summary.p95)}`,
    `  P99:     ${toMs(summary.p99)}`
  ].join("\n");
}

export default summarizeBenchmarks;
