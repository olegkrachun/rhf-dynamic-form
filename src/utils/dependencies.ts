import type { FieldElement, FormElement } from "../types";
import { flattenFields } from "./flattenFields";

/**
 * Maps parent field names to arrays of dependent field names.
 * Used to determine which fields should reset when a parent changes.
 */
export type DependencyMap = Record<string, string[]>;

/**
 * Builds a dependency map from form elements.
 * Maps parent field names to their dependent children.
 *
 * @param elements - Array of form elements
 * @returns Map of parent field names to dependent field names
 *
 * @example
 * ```typescript
 * const elements = [
 *   { type: 'select', name: 'country', options: [...] },
 *   { type: 'select', name: 'city', dependsOn: 'country', options: [...] }
 * ];
 *
 * const map = buildDependencyMap(elements);
 * // Returns: { country: ['city'] }
 * ```
 */
export const buildDependencyMap = (elements: FormElement[]): DependencyMap => {
  const map: DependencyMap = {};
  const fields = flattenFields(elements);

  for (const field of fields) {
    if (field.dependsOn) {
      const parent = field.dependsOn;
      if (!map[parent]) {
        map[parent] = [];
      }
      map[parent].push(field.name);
    }
  }

  return map;
};

/**
 * Finds a field by name in the form elements.
 *
 * @param elements - Array of form elements
 * @param name - Field name to find
 * @returns Field element if found, undefined otherwise
 */
export const findFieldByName = (
  elements: FormElement[],
  name: string
): FieldElement | undefined => {
  const fields = flattenFields(elements);
  return fields.find((field) => field.name === name);
};

/**
 * Gets the default value for a field based on structural detection.
 * Used when resetting dependent fields.
 *
 * Uses field shape (presence of `itemFields`, `multiple`, etc.)
 * instead of type strings so consumer-defined types get sensible defaults.
 *
 * @param field - Field element
 * @returns Default value appropriate for the field type
 */
export const getFieldTypeDefault = (field: FieldElement): unknown => {
  // Array fields — detected by `itemFields`
  if ("itemFields" in field) {
    return [];
  }

  // Select fields — detected by `options` or `multiple`
  if ("options" in field || "multiple" in field) {
    return "multiple" in field && field.multiple ? [] : null;
  }

  // Boolean fields — well-known convention for default reset value.
  // Consumer-defined boolean-like types should set `defaultValue` explicitly.
  if (field.type === "boolean") {
    return false;
  }

  // Everything else (text, email, phone, date, consumer-defined, etc.)
  return "";
};

/**
 * Gets the effective default value for a field.
 * Priority: config.defaultValue > type default
 *
 * @param field - Field element
 * @returns Default value to use when resetting
 */
export const getFieldDefault = (field: FieldElement): unknown => {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  return getFieldTypeDefault(field);
};
