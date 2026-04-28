import type { JsonLogicRule } from "../types";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

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

    if ("var" in node) {
      const ref = node.var;
      if (typeof ref === "string") {
        result.add(ref);
      } else if (Array.isArray(ref) && typeof ref[0] === "string") {
        result.add(ref[0]);
      }
    }

    for (const value of Object.values(node)) {
      walk(value);
    }
  };

  walk(rule);
  return [...result];
};
