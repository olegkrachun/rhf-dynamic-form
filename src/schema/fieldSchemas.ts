import { type ZodTypeAny, z } from "zod";
import type {
  ArrayFieldElement,
  FieldElement,
  SelectFieldElement,
  ValidationConfig,
} from "../types";

/**
 * Build the base Zod schema for a select field.
 *
 * @param field - Select field configuration
 * @returns Base Zod schema for the select field
 */
const buildSelectSchema = (field: SelectFieldElement): ZodTypeAny => {
  // Single select: string or number or null (for clearable)
  // Multiple select: array of strings/numbers
  if (field.multiple) {
    return z.array(z.union([z.string(), z.number()]));
  }
  return z.union([z.string(), z.number(), z.null()]);
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
 * Build the base Zod schema for a field based on its type.
 *
 * @param field - The field element configuration
 * @returns Base Zod schema for the field type
 */
const buildBaseSchema = (field: FieldElement): ZodTypeAny => {
  switch (field.type) {
    case "text":
    case "phone":
      return z.string();

    case "email":
      // Email type gets built-in email validation
      return z.string().email("Invalid email address");

    case "boolean":
      return z.boolean();

    case "date":
      // Date is stored as ISO string
      return z.string();

    case "select":
      return buildSelectSchema(field);

    case "array":
      return buildArraySchema(field);

    case "custom":
      // Custom fields accept any value
      return z.unknown();

    default:
      return z.unknown();
  }
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
      console.warn(`Invalid regex pattern: ${validation.pattern}`);
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
 * Apply validation configuration to a Zod schema based on field type.
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
  const fieldType = field.type;

  // String-based fields (text, phone, email, date)
  if (
    fieldType === "text" ||
    fieldType === "phone" ||
    fieldType === "email" ||
    fieldType === "date"
  ) {
    return applyStringValidation(schema as z.ZodString, validation);
  }

  // Boolean fields
  if (fieldType === "boolean") {
    return applyBooleanValidation(schema as z.ZodBoolean, validation);
  }

  // Select fields
  if (fieldType === "select") {
    return applySelectValidation(schema, validation, field.multiple ?? false);
  }

  // Custom and unknown types - no standard validation
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
