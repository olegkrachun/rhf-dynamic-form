import { ZodObject, type ZodTypeAny, z } from "zod";
import type { FieldElement, FormConfiguration, JsonLogicRule } from "../types";
import { flattenFields } from "../utils";
import { evaluateCondition } from "../validation";
import { buildFieldSchema } from "./fieldSchemas";
import { setNestedSchema } from "./nestedPaths";

/**
 * Represents a field with a JSON Logic validation condition.
 */
interface FieldCondition {
  /** Dot-notation path to the field (e.g., "source.phone") */
  fieldPath: string;
  /** JSON Logic rule to evaluate */
  condition: JsonLogicRule;
  /** Error message to display when condition fails */
  message: string;
}

/**
 * Extract all JSON Logic validation conditions from fields.
 *
 * @param fields - Array of field elements
 * @returns Array of field conditions to evaluate
 */
const collectConditions = (fields: FieldElement[]): FieldCondition[] => {
  const conditions: FieldCondition[] = [];

  for (const field of fields) {
    if (field.validation?.condition) {
      conditions.push({
        fieldPath: field.name,
        condition: field.validation.condition,
        message: field.validation.message || "Validation failed",
      });
    }
  }

  return conditions;
};

/**
 * Generated schema type - a Zod object schema.
 */
export type GeneratedSchema = ZodObject<Record<string, ZodTypeAny>>;

/**
 * Generate a Zod schema from form configuration.
 * Supports nested field paths via dot notation.
 *
 * This function is called once when the form initializes and the schema
 * is memoized. Visibility changes are handled at validation time, not
 * by regenerating the schema.
 *
 * @param config - Form configuration object
 * @returns Zod object schema for validating form data
 *
 * @example
 * ```typescript
 * const config = {
 *   elements: [
 *     { type: 'text', name: 'source.name', validation: { required: true } },
 *     { type: 'email', name: 'source.email' },
 *     { type: 'boolean', name: 'active' }
 *   ]
 * };
 *
 * const schema = generateZodSchema(config);
 *
 * // The generated schema is equivalent to:
 * // z.object({
 * //   source: z.object({
 * //     name: z.string().min(1, 'required'),
 * //     email: z.string().email()
 * //   }),
 * //   active: z.boolean()
 * // })
 *
 * schema.parse({
 *   source: { name: 'John', email: 'john@example.com' },
 *   active: true
 * }); // Valid
 * ```
 */
export const generateZodSchema = (
  config: FormConfiguration
): GeneratedSchema => {
  // Extract all field elements (flattening any containers/columns)
  const fields = flattenFields(config.elements);

  // Build the schema shape
  const schemaShape: Record<string, ZodTypeAny> = {};

  for (const field of fields) {
    // Build the Zod schema for this field
    const fieldSchema = buildFieldSchema(field);

    // Set it in the shape, handling nested paths
    setNestedSchema(schemaShape, field.name, fieldSchema);
  }

  // Create base schema
  let schema: ZodObject<Record<string, ZodTypeAny>> = z.object(schemaShape);

  // Collect JSON Logic conditions from fields
  const conditions = collectConditions(fields);

  // If there are JSON Logic conditions, add superRefine for cross-field validation
  if (conditions.length > 0) {
    schema = schema.superRefine((data, ctx) => {
      for (const { fieldPath, condition, message } of conditions) {
        // Evaluate the JSON Logic condition against full form data
        const isValid = evaluateCondition(
          condition,
          data as Record<string, unknown>
        );

        if (!isValid) {
          // Add error at the specific field path
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message,
            path: fieldPath.split("."),
          });
        }
      }
    }) as ZodObject<Record<string, ZodTypeAny>>;
  }

  return schema;
};

/**
 * Infer the TypeScript type from a generated schema.
 * Useful for typing form data in the consuming application.
 *
 * @example
 * ```typescript
 * const schema = generateZodSchema(config);
 * type FormData = InferSchemaType<typeof schema>;
 *
 * const onSubmit = (data: FormData) => {
 *   // data is fully typed based on configuration
 * };
 * ```
 */
export type InferSchemaType<T extends GeneratedSchema> = z.infer<T>;

/**
 * Extract field paths from a generated schema.
 * Returns all top-level and nested paths.
 *
 * @param schema - Generated Zod schema
 * @param prefix - Current path prefix (used in recursion)
 * @returns Array of all field paths
 */
export const getSchemaFieldPaths = (
  schema: ZodObject<Record<string, ZodTypeAny>>,
  prefix = ""
): string[] => {
  const paths: string[] = [];
  const shape = schema.shape;

  for (const key in shape) {
    if (Object.hasOwn(shape, key)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      const fieldSchema = shape[key];

      if (fieldSchema instanceof ZodObject) {
        // Recursively get paths from nested object
        paths.push(...getSchemaFieldPaths(fieldSchema, fullPath));
      } else {
        paths.push(fullPath);
      }
    }
  }

  return paths;
};
