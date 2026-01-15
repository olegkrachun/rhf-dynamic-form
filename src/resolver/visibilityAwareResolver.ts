import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { ZodObject, ZodRawShape } from "zod";
import type { InvisibleFieldValidation } from "../types";

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
export function createVisibilityAwareResolver<T extends ZodRawShape>(
  options: VisibilityAwareResolverOptions<T>
): Resolver<FieldValues> {
  // biome-ignore lint/suspicious/noExplicitAny: zodResolver requires complex type gymnastics with Zod v4
  const baseResolver = zodResolver(options.schema as any);

  return async (values, context, resolverOptions) => {
    // Run the base Zod resolver
    const result = await baseResolver(values, context, resolverOptions);

    // If no errors or we should validate all fields regardless of visibility, return as-is
    if (!result.errors || options.invisibleFieldValidation === "validate") {
      return result;
    }

    // Get current visibility state
    const visibility = options.getVisibility();
    const filteredErrors: FieldErrors<FieldValues> = {};

    // Filter errors based on visibility
    for (const [fieldPath, error] of Object.entries(result.errors)) {
      // Check if field is visible (default to true if not in visibility map)
      const isVisible = visibility[fieldPath] !== false;

      if (isVisible) {
        // Field is visible: include the error
        // biome-ignore lint/suspicious/noExplicitAny: react-hook-form error types are complex
        (filteredErrors as any)[fieldPath] = error;
      } else if (options.invisibleFieldValidation === "warn") {
        // Field is invisible but we want warnings: mark as warning type
        // biome-ignore lint/suspicious/noExplicitAny: react-hook-form error types are complex
        (filteredErrors as any)[fieldPath] = {
          ...(error as object),
          type: "warning",
        };
      }
      // If "skip", we don't include the error at all for invisible fields
    }

    return {
      values: result.values,
      errors: filteredErrors,
    };
  };
}
