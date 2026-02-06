function normalizeExpression(expression = "") {
  return expression
    .trim()
    .replace(/^json\.?/i, "")
    .replace(/\[\]/g, ".*")
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/\[\"([^\"]+)\"\]/g, ".$1");
}

function tokenize(expression = "") {
  return normalizeExpression(expression)
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function isObject(value) {
  return value !== null && typeof value === "object";
}

export function evaluateJsonPath(payload, expression) {
  if (!expression) return payload;
  const tokens = tokenize(expression);
  if (!tokens.length) return payload;

  let current = [payload];

  for (const token of tokens) {
    const next = [];
    for (const target of current) {
      if (token === "*") {
        if (Array.isArray(target)) {
          next.push(...target);
        }
        continue;
      }

      if (Array.isArray(target)) {
        const index = Number(token);
        if (!Number.isNaN(index) && target[index] !== undefined) {
          next.push(target[index]);
        }
        continue;
      }

      if (isObject(target) && Object.prototype.hasOwnProperty.call(target, token)) {
        next.push(target[token]);
      }
    }
    current = next;
    if (!current.length) break;
  }

  if (!current.length) return undefined;
  return current.length === 1 ? current[0] : current;
}

export function ensureArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function pathExists(payload, expression) {
  return evaluateJsonPath(payload, expression) !== undefined;
}

export default evaluateJsonPath;
