import type {
  DataMapOptions,
  FormData,
  OptionsResolver,
  SelectOption,
  SelectOptionsConfig,
} from "../types";
import { isDataMapOptions, isResolverOptions, isStaticOptions } from "../types";
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
  // Only primitive labels are meaningful; fall back to the value for
  // null/undefined/object labels rather than rendering "[object Object]".
  const label =
    typeof rawLabel === "string" || typeof rawLabel === "number"
      ? String(rawLabel)
      : String(rawValue);
  return { label, value: rawValue };
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

  // Surface the silent-drop footgun: a populated source that maps to nothing
  // usually means a misconfigured path (e.g. labelPath set but valuePath
  // omitted over an object array, so every value resolves to a non-primitive).
  if (source.length > 0 && result.length === 0) {
    console.warn(
      `resolveSelectOptions: data-map sourceField "${options.sourceField}" had ` +
        `${source.length} item(s) but none produced a valid option. Check ` +
        "labelPath/valuePath — omit both only for primitive arrays."
    );
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

  if (isDataMapOptions(options)) {
    return resolveDataMap(options, ctx.formValues);
  }

  // Not static, resolver, or data-map — an unrecognized shape (e.g. an
  // unvalidated object missing `sourceField`). Warn instead of crashing in
  // resolveDataMap on `getNestedValue(values, undefined)`.
  console.warn(
    "resolveSelectOptions: unrecognized options config (expected an array, " +
      "{ type: 'resolver', name }, or { sourceField, ... }). Returning no options."
  );
  return [];
}
