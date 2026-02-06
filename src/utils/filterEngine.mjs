import { evaluateJsonPath, ensureArray } from "./jsonPath.mjs";

function parseProjectionSpec(spec = "") {
  const inner = spec.trim().slice(1, -1); // remove braces
  return inner
    .split(",")
    .map((fragment) => fragment.trim())
    .filter(Boolean)
    .map((fragment) => {
      const [alias, path] = fragment.includes(":")
        ? fragment.split(":").map((part) => part.trim())
        : [fragment, fragment];
      return { alias, path };
    });
}

function resolveAgainstTarget(target, path) {
  if (path.startsWith("json.")) {
    return evaluateJsonPath(target.root, path);
  }
  if (path.startsWith(".")) {
    return evaluateJsonPath(target.value, path.slice(1));
  }
  return evaluateJsonPath(target.value, path);
}

function applyProjection(current, spec, root) {
  const entries = parseProjectionSpec(spec);
  if (!entries.length) return current;
  const values = ensureArray(current);
  const projected = values.map((value) => {
    const mapped = {};
    entries.forEach(({ alias, path }) => {
      mapped[alias] = resolveAgainstTarget({ value, root }, path);
    });
    return mapped;
  });
  return Array.isArray(current) ? projected : projected[0];
}

function evaluateStep(current, step, root) {
  if (step.startsWith("json.")) {
    return evaluateJsonPath(root, step);
  }
  const values = ensureArray(current);
  const results = values
    .map((value) => evaluateJsonPath(value, step))
    .flat();
  if (!results.length) return undefined;
  return Array.isArray(current) ? results : results[0];
}

export function runFilter(payload, expression = "") {
  if (!expression || !payload) return payload;
  const steps = expression
    .split("|")
    .map((step) => step.trim())
    .filter(Boolean);
  if (!steps.length) return payload;

  let current = payload;
  for (const step of steps) {
    if (step.startsWith("{") && step.endsWith("}")) {
      current = applyProjection(current, step, payload);
    } else {
      current = evaluateStep(current, step, payload);
    }
    if (current === undefined || current === null) break;
  }
  return current;
}

export default runFilter;
