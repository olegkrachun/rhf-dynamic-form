import { type ZodTypeAny, z } from "zod";
import type {
  ArrayFieldElement,
  FieldElement,
  SelectFieldElement,
  ValidationConfig,
} from "../types";

/**
 * Schema factory function type.
 * Maps a field type string to a base Zod schema.
 */
export type SchemaFactory = (field: FieldElement) => ZodTypeAny;

/**
 * Registry mapping field type strings to schema factories.
 * Consumers can provide their own to extend or override defaults.
 */
export type SchemaMap = Record<string, SchemaFactory>;

/**
 * Default schema factories for well-known field types.
 * Consumers import this and can extend/override entries.
 *
 * @example
 * ```typescript
 * import { defaultSchemaMap } from './fieldSchemas';
 *
 * const mySchemaMap = {
 *   ...defaultSchemaMap,
 *   currency: () => z.number().min(0),
 *   textarea: () => z.string(),
 * };
 * ```
 */
export const defaultSchemaMap: SchemaMap = {
  text: () => z.string(),
  phone: () => z.string(),
  email: () => z.string().email("Invalid email address"),
  boolean: () => z.boolean(),
  date: () => z.string(),
};

/**
 * Build the base Zod schema for a select field.
 *
 * @param field - Select field configuration
 * @returns Base Zod schema for the select field
 */
const buildSelectSchema = (field: SelectFieldElement): ZodTypeAny => {
  // Single select: string or number or null (for clearable) or object with value
  // Multiple select: array of strings/numbers or objects with value
  const primitiveValue = z.union([z.string(), z.number()]);
  // Some selects store full option objects like { code, value } or { value, label }
  const objectValue = z.object({}).passthrough();

  if (field.multiple) {
    return z.array(z.union([primitiveValue, objectValue]));
  }
  return z.union([primitiveValue, objectValue, z.null()]);
};

/**
 * Build the base Zod schema for an array field.
 * Recursively generates schema from itemFields.
 *
 * @param field - Array field configuration
 * @returns Base Zod schema for the array field
 */
const buildArraySchema = (field: ArrayFieldElement): ZodTypeAny => {
  // Build schema for each item field
  const itemShape: Record<string, ZodTypeAny> = {};

  for (const itemField of field.itemFields) {
    // Recursively build schema for each item field
    // Note: itemFields use simple names (not dot notation), so we can assign directly
    itemShape[itemField.name] = buildFieldSchema(itemField);
  }

  // Create the item schema
  let arraySchema = z.array(z.object(itemShape));

  // Apply min/max constraints
  if (field.minItems !== undefined) {
    arraySchema = arraySchema.min(
      field.minItems,
      `At least ${field.minItems} item(s) required`
    );
  }

  if (field.maxItems !== undefined) {
    arraySchema = arraySchema.max(
      field.maxItems,
      `Maximum ${field.maxItems} item(s) allowed`
    );
  }

  return arraySchema;
};

/**
 * The active schema map used by buildBaseSchema.
 * Initialized with defaultSchemaMap; can be replaced via setSchemaMap.
 */
let activeSchemaMap: SchemaMap = { ...defaultSchemaMap };

/**
 * Replace the active schema map.
 * Call this **once at app startup** to provide custom type → schema mappings.
 *
 * **SSR warning:** Because `activeSchemaMap` is module-scoped, calling this
 * per-request in SSR environments will affect all concurrent requests sharing
 * the same module instance. Only call at startup (e.g. in a top-level init
 * module), never inside request handlers or component renders.
 *
 * @param schemaMap - Custom schema map (merged with structural defaults)
 *
 * @example
 * ```typescript
 * import { setSchemaMap, defaultSchemaMap } from './fieldSchemas';
 *
 * setSchemaMap({
 *   ...defaultSchemaMap,
 *   currency: () => z.number().min(0),
 *   textarea: () => z.string(),
 * });
 * ```
 */
export const setSchemaMap = (schemaMap: SchemaMap): void => {
  activeSchemaMap = { ...schemaMap };
};

/**
 * Reset the active schema map back to `defaultSchemaMap`.
 * Useful for test isolation and SSR environments where module-level
 * state must not leak between requests or test cases.
 */
export const resetSchemaMap = (): void => {
  activeSchemaMap = { ...defaultSchemaMap };
};

/**
 * Build the base Zod schema for a field.
 *
 * Detection order:
 * 1. Schema map — look up `field.type` in the active schema map (consumer overrides win)
 * 2. Structural — `itemFields` → array schema, `options`/`multiple` → select schema
 * 3. Fallback — `z.unknown()`
 *
 * Schema map is checked first so consumers can override structural heuristics
 * (e.g. register a custom "select" factory that returns a different schema).
 *
 * @param field - The field element configuration
 * @returns Base Zod schema for the field type
 */
const buildBaseSchema = (field: FieldElement): ZodTypeAny => {
  // 1. Schema map lookup — configurable by consumers, checked first
  const factory = activeSchemaMap[field.type];
  if (factory) {
    return factory(field);
  }

  // 2. Structural detection — select and array have required structural properties
  if ("itemFields" in field) {
    return buildArraySchema(field as ArrayFieldElement);
  }
  if ("options" in field || "multiple" in field) {
    return buildSelectSchema(field as SelectFieldElement);
  }

  // 3. Fallback — consumer-defined types without a schema factory
  return z.unknown();
};

/**
 * Apply validation rules to a string schema.
 *
 * @param schema - Base string schema
 * @param validation - Validation configuration
 * @returns Schema with validation rules applied
 */
const applyStringValidation = (
  schema: z.ZodString,
  validation: ValidationConfig
): z.ZodString => {
  let result = schema;

  // Required validation - must be non-empty string
  if (validation.required) {
    result = result.min(1, "This field is required");
  }

  // Min length validation
  if (validation.minLength !== undefined) {
    result = result.min(
      validation.minLength,
      `Must be at least ${validation.minLength} characters`
    );
  }

  // Max length validation
  if (validation.maxLength !== undefined) {
    result = result.max(
      validation.maxLength,
      `Must be no more than ${validation.maxLength} characters`
    );
  }

  // Pattern validation (regex)
  if (validation.pattern) {
    try {
      const regex = new RegExp(validation.pattern);
      result = result.regex(regex, validation.message || "Invalid format");
    } catch {
      // Invalid regex pattern — constraint silently dropped.
      // This means validation will pass even though a pattern was configured.
      console.warn(
        `[dynamic-form] Invalid regex pattern "${validation.pattern}" — ` +
          "pattern validation will be skipped for this field."
      );
    }
  }

  return result;
};

/**
 * Apply validation rules to a boolean schema.
 *
 * @param schema - Base boolean schema
 * @param validation - Validation configuration
 * @returns Schema with validation rules applied
 */
const applyBooleanValidation = (
  schema: z.ZodBoolean,
  validation: ValidationConfig
): ZodTypeAny => {
  // For boolean "required", we interpret it as "must be true"
  // (e.g., accepting terms and conditions)
  if (validation.required) {
    return schema.refine((val) => val === true, {
      message: "This field is required",
    });
  }

  return schema;
};

/**
 * Apply validation rules to a select schema.
 *
 * @param schema - Base select schema
 * @param validation - Validation configuration
 * @param isMultiple - Whether this is a multi-select
 * @returns Schema with validation rules applied
 */
const applySelectValidation = (
  schema: ZodTypeAny,
  validation: ValidationConfig,
  isMultiple: boolean
): ZodTypeAny => {
  // For multi-select "required" means at least one selection
  if (validation.required && isMultiple) {
    return (schema as z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>>).min(
      1,
      "At least one selection is required"
    );
  }

  // For single select "required" means not null
  if (validation.required && !isMultiple) {
    return schema.refine((val) => val !== null && val !== undefined, {
      message: "This field is required",
    });
  }

  return schema;
};

/**
 * Apply validation configuration to a Zod schema based on schema shape.
 *
 * Uses schema introspection (not field type strings) to determine
 * which validation rules to apply. This keeps the engine type-agnostic.
 *
 * @param schema - Base Zod schema
 * @param validation - Validation configuration
 * @param field - Field element configuration
 * @returns Schema with validation rules applied
 */
const applyValidationRules = (
  schema: ZodTypeAny,
  validation: ValidationConfig,
  field: FieldElement
): ZodTypeAny => {
  // String-based schemas
  if (schema instanceof z.ZodString) {
    return applyStringValidation(schema, validation);
  }

  // Boolean schemas
  if (schema instanceof z.ZodBoolean) {
    return applyBooleanValidation(schema, validation);
  }

  // Select fields — detected structurally by the presence of `options` or `multiple`
  if ("options" in field || "multiple" in field) {
    const isMultiple =
      "multiple" in field && Boolean((field as SelectFieldElement).multiple);
    return applySelectValidation(schema, validation, isMultiple);
  }

  // Unknown/consumer-defined types — no standard validation applied
  return schema;
};

/**
 * Build a complete Zod schema for a single field.
 *
 * @param field - Field element configuration
 * @returns Zod schema for the field
 *
 * @example
 * ```typescript
 * const textField = {
 *   type: 'text',
 *   name: 'name',
 *   validation: { required: true, minLength: 3 }
 * };
 *
 * const schema = buildFieldSchema(textField);
 * // schema is z.string().min(1, 'required').min(3, '...')
 * ```
 */
export const buildFieldSchema = (field: FieldElement): ZodTypeAny => {
  // Create base schema for the field type
  let schema = buildBaseSchema(field);

  // Apply validation rules if present
  if (field.validation) {
    schema = applyValidationRules(schema, field.validation, field);
  }

  // For non-required fields, allow null and undefined values
  // This is important for optional text/phone/date fields that may have null data
  if (isFieldOptional(field)) {
    schema = schema.nullish();
  }

  return schema;
};

/**
 * Determines if a field is optional (has no required validation).
 *
 * @param field - Field element configuration
 * @returns true if the field is optional
 */
export const isFieldOptional = (field: FieldElement): boolean => {
  return !field.validation?.required;
};
