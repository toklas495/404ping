import { evaluateJsonPath } from "./jsonPath.mjs";

const OPERATORS = [">=", "<=", "!=", "=", ">", "<", "~=", "~"];

function detectOperator(rule) {
  for (const operator of OPERATORS) {
    if (rule.includes(operator)) {
      return operator;
    }
  }
  if (rule.includes(" !contains ")) return " !contains ";
  if (rule.includes(" contains ")) return " contains ";
  return null;
}

function stripQuotes(value = "") {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizeValue(value) {
  if (value === undefined || value === null) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber) && value.trim() !== "") {
      return asNumber;
    }
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
    return value.trim();
  }
  return value;
}

function compareValues(actual, expected, operator) {
  switch (operator) {
    case "=":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case ">":
      return Number(actual) > Number(expected);
    case "<":
      return Number(actual) < Number(expected);
    case ">=":
      return Number(actual) >= Number(expected);
    case "<=":
      return Number(actual) <= Number(expected);
    case " contains ": {
      if (typeof actual === "string") return actual.includes(String(expected));
      if (Array.isArray(actual)) return actual.includes(expected);
      return false;
    }
    case " !contains ": {
      if (typeof actual === "string") return !actual.includes(String(expected));
      if (Array.isArray(actual)) return !actual.includes(expected);
      return false;
    }
    case "~":
    case "~=": {
      const pattern = typeof expected === "string" && expected.startsWith("/")
        ? expected.slice(1, expected.lastIndexOf("/"))
        : String(expected);
      const regex = new RegExp(pattern);
      return regex.test(String(actual));
    }
    default:
      return actual === expected;
  }
}

function parseAssertion(rule = "") {
  const operator = detectOperator(rule);
  if (!operator) {
    return null;
  }
  const [lhs, rhs] = rule.split(operator);
  if (!lhs) return null;
  return {
    target: lhs.trim(),
    operator,
    expected: stripQuotes(rhs)
  };
}

function readActualValue(response, target = "") {
  if (!target) return { actual: undefined, description: target };
  if (target === "status") {
    return { actual: response.meta?.status, description: "status" };
  }
  if (target === "duration" || target === "time" || target === "durationMs") {
    return { actual: response.meta?.durationMs, description: "duration" };
  }
  if (target.startsWith("header.")) {
    const headerName = target.slice(7).toLowerCase();
    const headers = response.response?.headers || {};
    const actual = headers[headerName] || headers[Object.keys(headers).find((key) => key.toLowerCase() === headerName)];
    return { actual, description: `header.${headerName}` };
  }
  if (target.startsWith("json.")) {
    const payload = response.response?.json ?? (() => {
      try {
        return response.response?.body ? JSON.parse(response.response.body) : null;
      } catch {
        return null;
      }
    })();
    const actual = payload ? evaluateJsonPath(payload, target) : undefined;
    return { actual, description: target };
  }
  if (target === "body") {
    return { actual: response.response?.body, description: "body" };
  }
  return { actual: response[target], description: target };
}

export function runAssertions(response, assertionRules = [], format = "tap") {
  if (!Array.isArray(assertionRules) || assertionRules.length === 0) {
    return { passed: true, results: [], output: "" };
  }

  const results = assertionRules
    .map((rule, index) => {
      if (!rule || typeof rule !== "string") return null;
      const parsed = parseAssertion(rule);
      if (!parsed) {
        return {
          id: index + 1,
          description: rule,
          operator: "=",
          expected: null,
          actual: null,
          pass: false,
          message: "Invalid assertion syntax"
        };
      }
      const { actual, description } = readActualValue(response, parsed.target);
      const expected = normalizeValue(parsed.expected);
      const normalizedActual = normalizeValue(actual);
      const pass = compareValues(normalizedActual, expected, parsed.operator);
      return {
        id: index + 1,
        description,
        operator: parsed.operator,
        expected,
        actual: normalizedActual,
        pass,
        message: pass ? "" : `Expected ${description} ${parsed.operator} ${expected}, received ${normalizedActual}`
      };
    })
    .filter(Boolean);

  const output = format === "junit" ? formatJUnit(results) : formatTap(results);

  return {
    passed: results.every((r) => r.pass),
    results,
    output
  };
}

export function formatTap(results = []) {
  if (!results.length) return "";
  const lines = ["TAP version 13", `1..${results.length}`];
  results.forEach((result) => {
    lines.push(`${result.pass ? "ok" : "not ok"} ${result.id} ${result.description}`);
    if (!result.pass) {
      lines.push("  ---");
      lines.push(`  operator: ${result.operator}`);
      lines.push(`  expected: ${JSON.stringify(result.expected)}`);
      lines.push(`  actual: ${JSON.stringify(result.actual)}`);
      if (result.message) {
        lines.push(`  message: ${result.message}`);
      }
      lines.push("  ...");
    }
  });
  return lines.join("\n");
}

export function formatJUnit(results = []) {
  const tests = results.length;
  const failures = results.filter((r) => !r.pass).length;
  const lines = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    `<testsuite name=\"404ping\" tests=\"${tests}\" failures=\"${failures}\">`
  ];

  results.forEach((result) => {
    lines.push(`  <testcase classname=\"assertions\" name=\"${result.description}\">`);
    if (!result.pass) {
      lines.push(`    <failure message=\"${result.message || "Assertion failed"}\">`);
      lines.push(`      Expected ${result.description} ${result.operator} ${result.expected}, got ${result.actual}`);
      lines.push("    </failure>");
    }
    lines.push("  </testcase>");
  });

  lines.push("</testsuite>");
  return lines.join("\n");
}

export default runAssertions;
