import { ZodObject, type ZodTypeAny, z } from "zod";
import type {
  ArrayFieldElement,
  FieldElement,
  FormConfiguration,
  JsonLogicRule,
} from "../types";
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
 * A JSON Logic condition that lives on an array field's `itemFields` and must
 * be evaluated once per row.
 */
interface ArrayItemCondition {
  /** Dot-notation path to the array field (e.g., "supplemental.insurers") */
  arrayPath: string;
  /** Dot-notation path to the field within a row (e.g., "claimNumber.value") */
  itemFieldPath: string;
  /** JSON Logic rule — may reference `$item.*` (row-relative) or absolute paths */
  condition: JsonLogicRule;
  /** Error message to display when condition fails */
  message: string;
}

const isArrayField = (field: FieldElement): field is ArrayFieldElement =>
  "itemFields" in field && Array.isArray(field.itemFields);

/**
 * Strip a leading array-path prefix from an itemField name, so the per-row path
 * stays relative even if an authoring tool emits absolute itemField names.
 */
const normalizeItemFieldPath = (
  arrayPath: string,
  itemFieldName: string
): string =>
  itemFieldName.startsWith(`${arrayPath}.`)
    ? itemFieldName.slice(arrayPath.length + 1)
    : itemFieldName;

/**
 * Extract JSON Logic conditions defined on array `itemFields`. These are NOT
 * covered by `collectConditions` (which only sees flattened top-level fields —
 * `flattenFields` recurses into containers but pushes array fields whole, never
 * unrolling their itemFields), so without this they are silently ignored and
 * never block submission. No double-collection risk for the same reason.
 *
 * itemFields are themselves flattened defensively: containers inside them are
 * rejected by the types and by `parseConfiguration`, but `generateZodSchema`
 * is a public export and may receive an unparsed config.
 *
 * @param fields - Flattened field elements (array fields included)
 * @returns Conditions to evaluate per array row
 */
const collectArrayItemConditions = (
  fields: FieldElement[]
): ArrayItemCondition[] => {
  const conditions: ArrayItemCondition[] = [];

  for (const field of fields) {
    if (!isArrayField(field)) {
      continue;
    }
    for (const itemField of flattenFields(field.itemFields)) {
      if (itemField.validation?.condition) {
        conditions.push({
          arrayPath: field.name,
          itemFieldPath: normalizeItemFieldPath(field.name, itemField.name),
          condition: itemField.validation.condition,
          message: itemField.validation.message || "Validation failed",
        });
      }
    }
  }

  return conditions;
};

/**
 * Read a nested value from form data by dot-notation path.
 */
const getValueAtPath = (data: Record<string, unknown>, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      data
    );

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
  let schema: ZodObject<Record<string, ZodTypeAny>> =
    z.looseObject(schemaShape);

  // Collect JSON Logic conditions from fields
  const conditions = collectConditions(fields);
  const arrayItemConditions = collectArrayItemConditions(fields);

  // If there are JSON Logic conditions, add superRefine for cross-field validation
  if (conditions.length > 0 || arrayItemConditions.length > 0) {
    schema = schema.superRefine((data, ctx) => {
      const root = data as Record<string, unknown>;

      // Top-level (and nested object) field conditions.
      for (const { fieldPath, condition, message } of conditions) {
        if (!evaluateCondition(condition, root)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message,
            path: fieldPath.split("."),
          });
        }
      }

      // Array itemField conditions — evaluated once per row. `$item` resolves to
      // the row, while absolute paths still resolve against the full form data.
      for (const {
        arrayPath,
        itemFieldPath,
        condition,
        message,
      } of arrayItemConditions) {
        const rows = getValueAtPath(root, arrayPath);
        if (!Array.isArray(rows)) {
          continue;
        }
        rows.forEach((row, index) => {
          const isValid = evaluateCondition(condition, { ...root, $item: row });
          if (!isValid) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message,
              path: [
                ...arrayPath.split("."),
                index,
                ...itemFieldPath.split("."),
              ],
            });
          }
        });
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
