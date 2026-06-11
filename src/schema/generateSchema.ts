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

const isArrayField = (field: FieldElement): field is ArrayFieldElement =>
  "itemFields" in field && Array.isArray(field.itemFields);

/**
 * Whether an array field — or any array nested inside its rows — carries an
 * itemField `validation.condition` that needs per-row evaluation. Used to skip
 * the array superRefine when nothing depends on it.
 *
 * `flattenFields` unrolls containers wrapped inside itemFields (defensive: the
 * types and `parseConfiguration` reject them, but `generateZodSchema` is public
 * and may receive an unparsed config) while pushing nested arrays whole, so we
 * recurse into those explicitly.
 */
const arrayHasItemCondition = (field: ArrayFieldElement): boolean =>
  flattenFields(field.itemFields).some(
    (itemField) =>
      Boolean(itemField.validation?.condition) ||
      (isArrayField(itemField) && arrayHasItemCondition(itemField))
  );

/**
 * Evaluate every itemField `validation.condition` of an array, once per row,
 * recursing into nested arrays. `$item` resolves to the *nearest* row while
 * absolute paths resolve against the form root; the issue path carries the full
 * `[array, index, ...field]` prefix so the error attaches to the right cell.
 *
 * `itemField.name` is used raw — the same row-relative name `buildArraySchema`
 * feeds to `setNestedSchema` — so condition paths and row schemas share one
 * contract (no separate normalization). A nested condition can reference its own
 * row (`$item`) and absolute form paths, but not an *outer* row (there is no
 * `$parent` syntax).
 *
 * These conditions are invisible to `collectConditions`: `flattenFields` pushes
 * array fields whole and never unrolls their itemFields, so without this walk
 * per-row rules are silently ignored and never block submission.
 */
const validateArrayRows = (
  arrayField: ArrayFieldElement,
  rows: unknown,
  pathPrefix: (string | number)[],
  root: Record<string, unknown>,
  addIssue: (message: string, path: (string | number)[]) => void
): void => {
  if (!Array.isArray(rows)) {
    return;
  }

  const itemFields = flattenFields(arrayField.itemFields);

  rows.forEach((row, index) => {
    const rowData = (row ?? {}) as Record<string, unknown>;
    const itemContext = { ...root, $item: rowData };

    for (const itemField of itemFields) {
      const fieldPath = [...pathPrefix, index, ...itemField.name.split(".")];

      if (
        itemField.validation?.condition &&
        !evaluateCondition(itemField.validation.condition, itemContext)
      ) {
        addIssue(
          itemField.validation.message || "Validation failed",
          fieldPath
        );
      }

      if (isArrayField(itemField)) {
        validateArrayRows(
          itemField,
          getValueAtPath(rowData, itemField.name),
          fieldPath,
          root,
          addIssue
        );
      }
    }
  });
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
  const conditionArrayFields = fields
    .filter(isArrayField)
    .filter(arrayHasItemCondition);

  // If there are JSON Logic conditions, add superRefine for cross-field validation
  if (conditions.length > 0 || conditionArrayFields.length > 0) {
    schema = schema.superRefine((data, ctx) => {
      const root = data as Record<string, unknown>;
      const addIssue = (message: string, path: (string | number)[]) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });

      // Top-level (and nested object) field conditions.
      for (const { fieldPath, condition, message } of conditions) {
        if (!evaluateCondition(condition, root)) {
          addIssue(message, fieldPath.split("."));
        }
      }

      // Array itemField conditions — evaluated per row, recursing into nested
      // arrays. `$item` resolves to the nearest row; absolute paths to the root.
      for (const arrayField of conditionArrayFields) {
        validateArrayRows(
          arrayField,
          getValueAtPath(root, arrayField.name),
          arrayField.name.split("."),
          root,
          addIssue
        );
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
