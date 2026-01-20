import jsonLogic from "json-logic-js";
import type { JsonLogicRule } from "../types";

/**
 * Register custom JSON Logic operations.
 * Called once at module initialization.
 */
const registerCustomOperations = (): void => {
  /**
   * regex_match: Tests if a value matches a regex pattern.
   *
   * @example
   * ```json
   * { "regex_match": ["^[0-9]{10}$", { "var": "phone" }] }
   * ```
   */
  jsonLogic.add_operation(
    "regex_match",
    (pattern: string, value: unknown): boolean => {
      if (typeof value !== "string" || typeof pattern !== "string") {
        return false;
      }
      try {
        const regex = new RegExp(pattern);
        return regex.test(value);
      } catch {
        // Invalid regex pattern - fail gracefully
        return false;
      }
    }
  );
};

// Initialize custom operations at module load
registerCustomOperations();

/**
 * Evaluate a JSON Logic rule against form data.
 *
 * @param rule - JSON Logic rule to evaluate
 * @param data - Form data to evaluate against
 * @returns Result of the evaluation
 *
 * @example
 * ```typescript
 * const rule = { "==": [{ var: "status" }, "active"] };
 * const data = { status: "active" };
 * applyJsonLogic(rule, data); // true
 * ```
 */
export const applyJsonLogic = (
  rule: JsonLogicRule,
  data: Record<string, unknown>
): unknown => {
  return jsonLogic.apply(rule, data);
};

/**
 * Evaluate a JSON Logic rule and return boolean result.
 * Returns true if rule evaluates to a truthy value.
 *
 * @param rule - JSON Logic condition
 * @param data - Form data
 * @returns true if condition passes, false otherwise
 *
 * @example
 * ```typescript
 * const rule = { "and": [{ var: "active" }, { var: "confirmed" }] };
 * evaluateCondition(rule, { active: true, confirmed: true }); // true
 * evaluateCondition(rule, { active: true, confirmed: false }); // false
 * ```
 */
export const evaluateCondition = (
  rule: JsonLogicRule,
  data: Record<string, unknown>
): boolean => {
  const result = applyJsonLogic(rule, data);
  return Boolean(result);
};
