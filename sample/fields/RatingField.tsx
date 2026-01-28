import type {
  CustomComponentDefinition,
  CustomComponentRenderProps,
} from "../../src";

type RatingProps = {
  /** Maximum number of stars (1-10) */
  maxStars: number;
  /** Whether to show numeric value next to stars */
  showValue: boolean;
  /** Custom filled star character */
  filledChar: string;
  /** Custom empty star character */
  emptyChar: string;
} & Record<string, unknown>;

/**
 * Custom Rating Field - demonstrates custom component integration.
 *
 * This component uses the CustomComponentRenderProps pattern where:
 * - defaultProps are automatically merged
 * - componentProps are passed through from configuration
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
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
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
 * Export the component definition with default props.
 */
export const RatingField: CustomComponentDefinition<RatingProps> = {
  component: RatingFieldComponent,
  defaultProps: {
    maxStars: 5,
    showValue: true,
    filledChar: "★",
    emptyChar: "☆",
  },
  displayName: "RatingField",
  description: "A star rating input field with configurable max stars",
};

export default RatingField;
