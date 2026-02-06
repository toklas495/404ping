import { evaluateJsonPath } from "./jsonPath.mjs";

function parseRule(rule = "") {
  const [name, source] = rule.split("=");
  if (!name || !source) return null;
  return { name: name.trim(), source: source.trim() };
}

function readSource(response, source, derived = {}) {
  if (!source) return undefined;
  if (source.startsWith("json.")) {
    const payload = response.response?.json ?? (() => {
      try {
        return response.response?.body ? JSON.parse(response.response.body) : null;
      } catch {
        return null;
      }
    })();
    return payload ? evaluateJsonPath(payload, source) : undefined;
  }
  if (source.startsWith("header.")) {
    const key = source.slice(7).toLowerCase();
    const headers = response.response?.headers || {};
    const foundKey = Object.keys(headers).find((name) => name.toLowerCase() === key);
    return foundKey ? headers[foundKey] : undefined;
  }
  if (source === "status") {
    return response.meta?.status;
  }
  if (source.startsWith("filter.")) {
    const path = source.replace(/^filter\.?/, "");
    const payload = derived.filterResult;
    return path ? evaluateJsonPath(payload, path) : payload;
  }
  if (source === "duration" || source === "durationMs") {
    return response.meta?.durationMs;
  }
  if (source.startsWith("body")) {
    return response.response?.body;
  }
  return undefined;
}

export function extractValues(response, rules = [], derived = {}) {
  if (!Array.isArray(rules) || !rules.length) {
    return { extracted: {}, printed: [] };
  }
  const extracted = {};
  const printed = [];

  rules.forEach((rule) => {
    const parsed = parseRule(rule);
    if (!parsed) return;
    const value = readSource(response, parsed.source, derived);
    if (value !== undefined) {
      extracted[parsed.name] = value;
      printed.push({ name: parsed.name, value });
    }
  });

  return { extracted, printed };
}

export default extractValues;
