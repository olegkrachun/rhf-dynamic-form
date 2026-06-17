import type {
  DataMapOptions,
  FormData,
  OptionsResolver,
  SelectOption,
  SelectOptionsConfig,
} from "../types";
import { isResolverOptions, isStaticOptions } from "../types";
import { getNestedValue } from "../utils";

/**
 * Context passed to {@link resolveSelectOptions}.
 */
export interface ResolveSelectOptionsContext {
  /** All current form values — the source for data-map paths and resolvers. */
  formValues: FormData;
  /** The field whose options are being resolved (passed through to resolvers). */
  fieldName: string;
  /** Named resolvers registered on the form (`components.resolvers`). */
  resolvers?: Record<string, OptionsResolver>;
}

/**
 * Reads a value from an item that may be a primitive or an object.
 * `getNestedValue` returns `undefined` for non-objects, so primitives are safe.
 */
const readPath = (item: unknown, path: string): unknown =>
  getNestedValue(item as Record<string, unknown>, path);

/**
 * Maps a single source item to a `SelectOption`, or `null` if its resolved
 * value cannot be represented (not a string/number).
 *
 * `labelPath`/`valuePath` are independently optional: when a path is omitted the
 * item itself is used for that axis (the primitive-array case).
 */
const itemToOption = (
  item: unknown,
  { labelPath, valuePath }: DataMapOptions
): SelectOption | null => {
  const rawValue = valuePath === undefined ? item : readPath(item, valuePath);

  // Value must be a primitive string or number — skip anything else
  // (null, undefined, objects, arrays, booleans).
  if (typeof rawValue !== "string" && typeof rawValue !== "number") {
    return null;
  }

  const rawLabel =
    labelPath === undefined ? rawValue : readPath(item, labelPath);
  return { label: String(rawLabel ?? rawValue), value: rawValue };
};

/**
 * Resolves options from a {@link DataMapOptions} descriptor against form data.
 */
const resolveDataMap = (
  options: DataMapOptions,
  formValues: FormData
): SelectOption[] => {
  const source = getNestedValue(formValues, options.sourceField);

  if (!Array.isArray(source)) {
    console.warn(
      `resolveSelectOptions: data-map sourceField "${options.sourceField}" ` +
        "did not resolve to an array. Returning no options."
    );
    return [];
  }

  const result: SelectOption[] = [];
  for (const item of source) {
    const option = itemToOption(item, options);
    if (option !== null) {
      result.push(option);
    }
  }
  return result;
};

/**
 * Pure resolution of a select field's `options` config into `SelectOption[]`.
 *
 * - **static** (`SelectOption[]`) → returned unchanged.
 * - **data-map** (`{ sourceField, labelPath?, valuePath? }`) → derived from the
 *   array at `sourceField` in the form values. Non-array sources warn and yield
 *   `[]`. Items are mapped per path (or used directly for primitive arrays);
 *   items whose value is not a string/number are skipped. Order is preserved
 *   and duplicates are kept.
 * - **resolver** (`{ type: "resolver", name }`) → invokes the named resolver
 *   from `ctx.resolvers`, returning its (possibly async) result. An unknown name
 *   warns and yields `[]`.
 *
 * When `options` is `undefined`, returns `[]` (legacy `optionsSource` handling
 * is left to the consumer's field component).
 *
 * @returns `SelectOption[]` synchronously, except for async resolvers which
 * return a `Promise<SelectOption[]>`.
 */
export function resolveSelectOptions(
  options: SelectOptionsConfig | undefined,
  ctx: ResolveSelectOptionsContext
): SelectOption[] | Promise<SelectOption[]> {
  if (options === undefined) {
    return [];
  }

  if (isStaticOptions(options)) {
    return options;
  }

  if (isResolverOptions(options)) {
    const resolver = ctx.resolvers?.[options.name];
    if (!resolver) {
      console.warn(
        `resolveSelectOptions: no resolver registered for "${options.name}". ` +
          "Register it via components.resolvers. Returning no options."
      );
      return [];
    }
    return resolver({ formValues: ctx.formValues, fieldName: ctx.fieldName });
  }

  return resolveDataMap(options, ctx.formValues);
}
