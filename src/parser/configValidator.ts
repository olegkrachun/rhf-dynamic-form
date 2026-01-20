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
    type: z.enum(["number", "email", "date"]).optional(),
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(0).optional(),
    pattern: z.string().optional(),
    message: z.string().optional(),
    condition: jsonLogicRuleSchema.optional(),
  })
  .strict()
  .optional();

/**
 * Base field element schema (common properties).
 */
const baseFieldSchema = z.object({
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
});

/**
 * Text field element schema.
 */
const textFieldSchema = baseFieldSchema.extend({
  type: z.literal("text"),
});

/**
 * Email field element schema.
 */
const emailFieldSchema = baseFieldSchema.extend({
  type: z.literal("email"),
});

/**
 * Boolean field element schema.
 */
const booleanFieldSchema = baseFieldSchema.extend({
  type: z.literal("boolean"),
});

/**
 * Phone field element schema.
 */
const phoneFieldSchema = baseFieldSchema.extend({
  type: z.literal("phone"),
});

/**
 * Date field element schema.
 */
const dateFieldSchema = baseFieldSchema.extend({
  type: z.literal("date"),
});

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
      // Options are required when no optionsSource is provided or when using static source
      if (!data.optionsSource || data.optionsSource.type === "static") {
        return data.options !== undefined && data.options.length >= 0;
      }
      return true;
    },
    { message: "Options are required when optionsSource is not provided" }
  );

/**
 * Custom field element schema.
 */
const customFieldSchema = baseFieldSchema.extend({
  type: z.literal("custom"),
  component: z.string().min(1, "Custom component name is required"),
  componentProps: z.record(z.string(), z.unknown()).optional(),
});

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
 * Field element schema - union of all field types.
 */
const fieldElementSchema: z.ZodType<unknown> = z.discriminatedUnion("type", [
  textFieldSchema,
  emailFieldSchema,
  booleanFieldSchema,
  phoneFieldSchema,
  dateFieldSchema,
  selectFieldSchema,
  customFieldSchema,
  arrayFieldSchema,
]);

/**
 * Form element schema - for Phase 1, only field elements are supported.
 * Phase 2 will add container and column schemas.
 *
 * We use a lazy schema to allow for future recursive definitions
 * (containers containing columns containing elements).
 */
const formElementSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([fieldElementSchema, containerElementSchema, columnElementSchema])
);

/**
 * Column element schema (for Phase 2, but defined here for type completeness).
 */
const columnElementSchema = z.object({
  type: z.literal("column"),
  width: z.string().min(1, "Column width is required"),
  elements: z.array(z.lazy(() => formElementSchema)),
  visible: jsonLogicRuleSchema.optional(),
});

/**
 * Container element schema (for Phase 2).
 */
const containerElementSchema = z.object({
  type: z.literal("container"),
  columns: z.array(columnElementSchema),
  visible: jsonLogicRuleSchema.optional(),
});

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
