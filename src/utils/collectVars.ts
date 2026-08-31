import type { JsonLogicRule } from "../types";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const getOperatorPaths = (node: Record<string, unknown>): unknown[] => {
  if ("missing" in node) {
    return Array.isArray(node.missing) ? node.missing : [node.missing];
  }
  if (Array.isArray(node.missing_some)) {
    const paths = node.missing_some[1];
    return Array.isArray(paths) ? paths : [paths];
  }
  const variable = Array.isArray(node.var) ? node.var[0] : node.var;
  return [variable];
};

/**
 * Walks a JSON Logic rule and returns every distinct `var` reference.
 *
 * Used by `FieldRenderer` to derive cross-field validation peers from
 * `validation.condition` — every path the rule reads is a field whose
 * change should re-run this field's validation. The lib forwards the
 * resulting list as `useController({ rules: { deps } })`, so RHF handles
 * the actual re-trigger natively.
 *
 * Supports both shapes documented by the json-logic spec:
 *   `{ var: 'a.b.c' }`
 *   `{ var: ['a.b.c', defaultValue] }`
 *
 * Continues to walk sibling keys after collecting a `var` so refs nested
 * inside fallback values (e.g. `{ var: 'a', fallback: { var: 'b' } }`) are
 * not missed.
 *
 * @example
 *   collectVars({ '!': { and: [{ var: 'yes' }, { var: 'no' }] } })
 *   // → ['yes', 'no']
 */
export const collectVars = (rule: JsonLogicRule): string[] => {
  const result = new Set<string>();

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) {
        walk(child);
      }
      return;
    }

    if (!isPlainObject(node)) {
      return;
    }

    for (const path of getOperatorPaths(node)) {
      if (typeof path === "string") {
        result.add(path);
      }
    }

    for (const value of Object.values(node)) {
      walk(value);
    }
  };

  walk(rule);
  return [...result];
};
