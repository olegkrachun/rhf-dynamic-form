import type { FieldElement, FormConfiguration, FormData } from "../types";
import { flattenFields } from "./flattenFields";

/**
 * Sets a value in a nested object using dot notation path.
 *
 * @param obj - Object to modify
 * @param path - Dot-notation path (e.g., 'source.name')
 * @param value - Value to set
 *
 * @example
 * ```typescript
 * const obj = {};
 * setNestedValue(obj, 'source.name', 'John');
 * // obj is now { source: { name: 'John' } }
 * ```
 */
export const setNestedValue = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void => {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (
      !(part in current) ||
      typeof current[part] !== "object" ||
      current[part] === null
    ) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts.at(-1);
  if (lastPart !== undefined) {
    current[lastPart] = value;
  }
};

/**
 * Gets a value from a nested object using dot notation path.
 *
 * @param obj - Object to read from
 * @param path - Dot-notation path (e.g., 'source.name')
 * @returns The value at the path, or undefined if not found
 *
 * @example
 * ```typescript
 * const obj = { source: { name: 'John' } };
 * getNestedValue(obj, 'source.name'); // 'John'
 * getNestedValue(obj, 'source.email'); // undefined
 * ```
 */
export const getNestedValue = (
  obj: Record<string, unknown>,
  path: string
): unknown => {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
};

/**
 * Deep clones a value, ensuring arrays and objects are new instances.
 * This prevents "Cannot assign to read only property" errors with frozen Redux state.
 */
const deepClone = (value: unknown): unknown => {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(deepClone);
  }

  const result: Record<string, unknown> = {};
  for (const key in value) {
    if (Object.hasOwn(value as Record<string, unknown>, key)) {
      result[key] = deepClone((value as Record<string, unknown>)[key]);
    }
  }
  return result;
};

/**
 * Deep merge two objects. Source values override target values.
 *
 * @param target - Base object
 * @param source - Object to merge in (takes precedence)
 * @returns New merged object
 */
const deepMerge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...target };

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else {
        // Deep clone arrays and other values to prevent frozen state issues
        result[key] = deepClone(sourceValue);
      }
    }
  }

  return result;
};

/**
 * Gets the default value for a field based on structural detection.
 *
 * Uses field shape (presence of `multiple`, `itemFields`, etc.)
 * instead of type strings so unknown/consumer-defined types still
 * get a sensible default.
 *
 * @param field - Field element
 * @returns Appropriate default value for the field type
 */
const getTypeDefault = (field: FieldElement): unknown => {
  // Array fields — detected by `itemFields`
  if ("itemFields" in field) {
    return [];
  }

  // Select fields — detected by `options` or `multiple`
  if ("options" in field || "multiple" in field) {
    return "multiple" in field && field.multiple ? [] : null;
  }

  // Boolean fields
  if (field.type === "boolean") {
    return false;
  }

  // Everything else (text, email, phone, date, consumer-defined, etc.)
  return "";
};

/**
 * Merges configuration default values with initial data.
 * Priority: initialData > config.defaultValue > type default
 *
 * IMPORTANT: All values are deep cloned to prevent "Cannot assign to read only property"
 * errors when working with frozen Redux state.
 *
 * @param config - Form configuration containing field definitions
 * @param initialData - Initial data provided by the user
 * @returns Merged default values for react-hook-form
 *
 * @example
 * ```typescript
 * const config = {
 *   elements: [
 *     { type: 'text', name: 'source.name', defaultValue: 'Default Name' },
 *     { type: 'boolean', name: 'source.active' }
 *   ]
 * };
 *
 * const initialData = { source: { name: 'Provided Name' } };
 * const defaults = mergeDefaults(config, initialData);
 * // Result: { source: { name: 'Provided Name', active: false } }
 * ```
 */
export const mergeDefaults = (
  config: FormConfiguration,
  initialData?: FormData
): FormData => {
  const defaults: Record<string, unknown> = {};
  const fields = flattenFields(config.elements);

  // First, set type defaults and config defaults
  for (const field of fields) {
    const typeDefault = getTypeDefault(field);
    const configDefault = field.defaultValue ?? typeDefault;
    setNestedValue(defaults, field.name, configDefault);
  }

  // Then merge with initial data (initial data takes precedence)
  if (initialData) {
    // Deep clone the entire initialData first to ensure no frozen references
    const clonedInitialData = deepClone(initialData) as Record<string, unknown>;
    return deepMerge(defaults, clonedInitialData);
  }

  return defaults;
};
