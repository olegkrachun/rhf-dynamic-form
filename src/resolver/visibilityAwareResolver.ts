import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { ZodObject, ZodRawShape } from "zod";
import type { InvisibleFieldValidation } from "../types";

/**
 * Check if a value is a leaf error node.
 * React-hook-form leaf errors have both 'type' and 'message' properties.
 */
const isLeafError = (value: unknown): boolean =>
  value !== null &&
  typeof value === "object" &&
  "type" in value &&
  "message" in value;

/**
 * Create a warning error from an existing error object.
 */
const createWarningError = (error: unknown): unknown => ({
  ...(error as object),
  type: "warning",
});

/**
 * Process a single error entry based on visibility rules.
 * Returns the error to include or undefined to skip.
 */
const processLeafError = (
  value: unknown,
  path: string,
  visibility: Record<string, boolean>,
  warnMode: boolean
): unknown => {
  const isVisible = visibility[path] !== false;

  if (isVisible) {
    return value;
  }
  if (warnMode) {
    return createWarningError(value);
  }
  return undefined;
};

/**
 * Recursively filter errors based on field visibility.
 * Handles nested error structures for dot-notation paths.
 */
const filterErrorsByVisibility = (
  errors: FieldErrors<FieldValues>,
  visibility: Record<string, boolean>,
  warnMode: boolean,
  parentPath = ""
): FieldErrors<FieldValues> => {
  const acc: FieldErrors<FieldValues> = {};

  for (const [key, value] of Object.entries(errors)) {
    const path = parentPath ? `${parentPath}.${key}` : key;

    // Handle nested objects (recurse)
    if (!isLeafError(value) && value && typeof value === "object") {
      const nested = filterErrorsByVisibility(
        value as FieldErrors<FieldValues>,
        visibility,
        warnMode,
        path
      );
      if (Object.keys(nested).length > 0) {
        // biome-ignore lint/suspicious/noExplicitAny: react-hook-form error types are complex
        (acc as any)[key] = nested;
      }
      continue;
    }

    // Handle leaf errors
    const processed = processLeafError(value, path, visibility, warnMode);
    if (processed !== undefined) {
      // biome-ignore lint/suspicious/noExplicitAny: react-hook-form error types are complex
      (acc as any)[key] = processed;
    }
  }

  return acc;
};

/**
 * Options for creating a visibility-aware resolver.
 */
export interface VisibilityAwareResolverOptions<T extends ZodRawShape> {
  /** Zod schema for validation */
  schema: ZodObject<T>;
  /** Function that returns current visibility state for all fields */
  getVisibility: () => Record<string, boolean>;
  /** How to handle validation for invisible fields */
  invisibleFieldValidation: InvisibleFieldValidation;
}

/**
 * Creates a resolver that respects field visibility.
 *
 * This resolver wraps the standard zodResolver and filters validation
 * errors based on field visibility. This is useful when fields are
 * conditionally shown/hidden and you want to skip validation for
 * hidden fields.
 *
 * @param options - Configuration for the resolver
 * @returns A react-hook-form resolver
 *
 * @example
 * ```typescript
 * const resolver = createVisibilityAwareResolver({
 *   schema: myZodSchema,
 *   getVisibility: () => ({ name: true, phone: false }),
 *   invisibleFieldValidation: "skip",
 * });
 *
 * const form = useForm({ resolver });
 * ```
 */
export const createVisibilityAwareResolver = <T extends ZodRawShape>(
  options: VisibilityAwareResolverOptions<T>
): Resolver<FieldValues> => {
  // biome-ignore lint/suspicious/noExplicitAny: zodResolver requires complex type gymnastics with Zod v4
  const baseResolver = zodResolver(options.schema as any);

  return async (values, context, resolverOptions) => {
    // Run the base Zod resolver
    const result = await baseResolver(values, context, resolverOptions);

    // If no errors or we should validate all fields regardless of visibility, return as-is
    if (!result.errors || options.invisibleFieldValidation === "validate") {
      return result;
    }

    // Filter errors based on visibility
    const visibility = options.getVisibility();
    const warnMode = options.invisibleFieldValidation === "warn";
    const filteredErrors = filterErrorsByVisibility(
      result.errors,
      visibility,
      warnMode
    );

    return {
      values: result.values,
      errors: filteredErrors,
    };
  };
};
