import { z } from "zod/v4";
import {
  type CustomComponentRenderProps,
  defineCustomComponent,
} from "../../src";

/**
 * Props schema for RatingField.
 * Validates componentProps at parse time via Phase 5 integration.
 */
const ratingPropsSchema = z.object({
  /** Maximum number of stars (1-10) */
  maxStars: z.number().int().min(1).max(10).default(5),
  /** Whether to show numeric value next to stars */
  showValue: z.boolean().default(true),
  /** Custom filled star character */
  filledChar: z.string().default("★"),
  /** Custom empty star character */
  emptyChar: z.string().default("☆"),
});

type RatingProps = z.infer<typeof ratingPropsSchema>;

/**
 * Custom Rating Field - demonstrates Phase 5 custom component integration.
 *
 * This component uses the new CustomComponentRenderProps pattern where:
 * - componentProps are validated at form parse time
 * - defaultProps are automatically merged
 * - Props are typed via Zod schema inference
 *
 * @example Config usage:
 * ```json
 * {
 *   "type": "custom",
 *   "name": "rating",
 *   "component": "RatingField",
 *   "componentProps": { "maxStars": 10 }
 * }
 * ```
 */
const RatingFieldComponent = ({
  field,
  fieldState,
  config,
  componentProps,
}: CustomComponentRenderProps<RatingProps>) => {
  const { error } = fieldState;
  const { maxStars, showValue, filledChar, emptyChar } = componentProps;
  const currentValue = (field.value as number) || 0;

  const handleClick = (rating: number) => {
    // Toggle off if clicking the same rating
    field.onChange(currentValue === rating ? 0 : rating);
  };

  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <fieldset className="field rating-field">
      {config.label && <legend className="field__label">{config.label}</legend>}
      <div className="rating-field__buttons">
        {stars.map((star) => (
          <button
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className={`rating-field__star ${star <= currentValue ? "rating-field__star--filled" : ""}`}
            key={star}
            onBlur={field.onBlur}
            onClick={() => handleClick(star)}
            type="button"
          >
            {star <= currentValue ? filledChar : emptyChar}
          </button>
        ))}
        {showValue && (
          <span className="rating-field__value">
            {currentValue > 0 ? `${currentValue}/${maxStars}` : "No rating"}
          </span>
        )}
      </div>
      {error && <span className="field__error">{error.message as string}</span>}
    </fieldset>
  );
};

/**
 * Export the component definition with schema validation.
 * This enables parse-time validation of componentProps.
 * Defaults are defined in ratingPropsSchema via .default() - no separate defaultProps needed.
 */
export const RatingField = defineCustomComponent<RatingProps>({
  component: RatingFieldComponent,
  propsSchema: ratingPropsSchema,
  displayName: "RatingField",
  description: "A star rating input field with configurable max stars",
});

export default RatingField;
