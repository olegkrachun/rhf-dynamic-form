import { z } from "zod";

/**
 * JSON Logic rule schema - accepts any object structure.
 * Actual JSON Logic validation happens at runtime.
 */
const jsonLogicRuleSchema = z.record(z.string(), z.unknown());

/**
 * Validation configuration schema.
 */
const validationConfigSchema = z
  .object({
    required: z.boolean().optional(),
    type: z.string().optional(),
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(0).optional(),
    pattern: z.string().optional(),
    message: z.string().optional(),
    condition: jsonLogicRuleSchema.optional(),
  })
  .strict()
  .optional();

/**
 * Consumer-specific metadata schema.
 * Accepts any key-value pairs — the engine does not interpret these.
 */
const metaSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Base field element schema (common properties).
 *
 * The engine accepts ANY `type` string (except "container") as a field.
 * Well-known types get structural refinement (select needs options,
 * array needs itemFields, custom needs component), but unknown types
 * pass through with just `type` + `name`.
 */
const baseFieldSchema = z
  .object({
    type: z.string().min(1, "Field type is required"),
    name: z.string().min(1, "Field name is required"),
    label: z.string().optional(),
    placeholder: z.string().optional(),
    defaultValue: z
      .union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(z.unknown()),
        z.record(z.string(), z.unknown()),
      ])
      .optional(),
    validation: validationConfigSchema,
    visible: jsonLogicRuleSchema.optional(),
    dependsOn: z.string().optional(),
    resetOnParentChange: z.boolean().optional(),
    meta: metaSchema,
  })
  .catchall(z.unknown());

/**
 * Select option schema.
 */
const selectOptionSchema = z.object({
  value: z.union([z.string(), z.number()]),
  label: z.string(),
  disabled: z.boolean().optional(),
});

/**
 * Options source schema - describes how to resolve options.
 */
const optionsSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("static") }),
  z.object({ type: z.literal("map"), key: z.string() }),
  z.object({ type: z.literal("api"), endpoint: z.string() }),
  z.object({
    type: z.literal("search"),
    endpoint: z.string(),
    minChars: z.number().optional(),
  }),
  z.object({ type: z.literal("resolver"), name: z.string() }),
]);

/**
 * Select field element schema.
 * Options are required when optionsSource is not provided.
 */
const selectFieldSchema = baseFieldSchema
  .extend({
    type: z.literal("select"),
    options: z.array(selectOptionSchema).optional(),
    optionsSource: optionsSourceSchema.optional(),
    multiple: z.boolean().optional(),
    clearable: z.boolean().optional(),
    searchable: z.boolean().optional(),
    creatable: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (!data.optionsSource || data.optionsSource.type === "static") {
        return data.options !== undefined;
      }
      return true;
    },
    { message: "Options are required when optionsSource is not provided" }
  );

/**
 * Custom field element schema.
 * Requires a `component` name for registry lookup.
 */
const customFieldSchema = baseFieldSchema.extend({
  type: z.literal("custom"),
  component: z.string().min(1, "Custom component name is required"),
  componentProps: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Forward declaration for formElementSchema (used in recursive schemas).
 * The engine knows only two element kinds: field and container.
 */
const formElementSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([fieldElementSchema, containerElementSchema])
);

/**
 * Array field element schema.
 * Contains repeatable group of fields.
 */
const arrayFieldSchema = baseFieldSchema
  .extend({
    type: z.literal("array"),
    itemFields: z.lazy(() => z.array(fieldElementSchema)),
    minItems: z.number().int().min(0).optional(),
    maxItems: z.number().int().min(0).optional(),
    addButtonLabel: z.string().optional(),
    sortable: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.minItems !== undefined && data.maxItems !== undefined) {
        return data.minItems <= data.maxItems;
      }
      return true;
    },
    { message: "minItems must be less than or equal to maxItems" }
  );

/**
 * Types with structural requirements that MUST be validated
 * by their specific schemas (select, custom, array).
 * The generic schema rejects these so they don't sneak through
 * with missing required properties.
 *
 * **Keep in sync** with the union members in `fieldElementSchema` below.
 * If a new structurally-specific type is added to the union, add it here too.
 */
const STRUCTURALLY_SPECIFIC_TYPES = new Set([
  "container",
  "select",
  "custom",
  "array",
]);

/**
 * Generic field element schema.
 *
 * Accepts any field with `type` + `name` EXCEPT:
 * - "container" (must be validated by containerElementSchema)
 * - "select" (must be validated by selectFieldSchema — needs options)
 * - "custom" (must be validated by customFieldSchema — needs component)
 * - "array" (must be validated by arrayFieldSchema — needs itemFields)
 */
const genericFieldSchema = baseFieldSchema.refine(
  (data) => !STRUCTURALLY_SPECIFIC_TYPES.has(data.type),
  { message: "This type requires specific structural properties" }
);

/**
 * Field element schema — union of structurally-specific types + open-ended generic.
 *
 * Order matters: specific schemas (select, custom, array) are tried first
 * so their structural requirements (options, component, itemFields) are enforced.
 * The generic schema catches everything else — any `type` string is valid.
 */
const fieldElementSchema: z.ZodType<unknown> = z.union([
  selectFieldSchema,
  customFieldSchema,
  arrayFieldSchema,
  genericFieldSchema,
]);

/**
 * Container element schema.
 * Variant determines which container component renders it.
 * All layout-specific data (width, title, icon, etc.) goes in `meta`.
 */
const containerElementSchema = z
  .object({
    type: z.literal("container"),
    variant: z.string().optional(),
    children: z.array(z.lazy(() => formElementSchema)).optional(),
    visible: jsonLogicRuleSchema.optional(),
    meta: metaSchema,
  })
  .catchall(z.unknown());

/**
 * Custom component definition schema.
 */
const customComponentDefinitionSchema = z.object({
  defaultProps: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Root form configuration schema.
 */
export const formConfigurationSchema = z.object({
  name: z.string().optional(),
  elements: z
    .array(formElementSchema)
    .min(1, "At least one element is required"),
  customComponents: z
    .record(z.string(), customComponentDefinitionSchema)
    .optional(),
});

/**
 * Type inferred from the form configuration schema.
 */
export type ParsedFormConfiguration = z.infer<typeof formConfigurationSchema>;

/**
 * Validates a form configuration object.
 *
 * @param config - Configuration object to validate
 * @returns Validated and typed configuration
 * @throws ZodError if validation fails
 */
export const validateConfiguration = (
  config: unknown
): ParsedFormConfiguration => {
  return formConfigurationSchema.parse(config);
};

/**
 * Safely validates a form configuration object without throwing.
 *
 * @param config - Configuration object to validate
 * @returns Result object with success status and data or error
 */
export const safeValidateConfiguration = (config: unknown) => {
  return formConfigurationSchema.safeParse(config);
};
