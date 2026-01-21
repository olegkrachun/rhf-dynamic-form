import type { CustomComponentDefinition } from "./types";

/**
 * Type-safe helper for defining custom components.
 * Provides TypeScript inference for component props based on propsSchema.
 *
 * @example
 * ```ts
 * const RatingField = defineCustomComponent({
 *   component: RatingFieldComponent,
 *   propsSchema: z.object({ maxStars: z.number() }),
 *   defaultProps: { maxStars: 5 },
 * });
 * ```
 */
export function defineCustomComponent<
  TProps extends Record<string, unknown> = Record<string, unknown>,
>(
  definition: CustomComponentDefinition<TProps>
): CustomComponentDefinition<TProps> {
  return definition;
}
