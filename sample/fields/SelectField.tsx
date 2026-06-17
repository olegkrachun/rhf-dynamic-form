import type { BaseFieldComponent, SelectFieldElement } from "../../src";
import { getNestedValue, useSelectOptions } from "../../src";

/**
 * Normalize select value for single vs multi-select.
 * Multi-select requires array of strings, single-select requires string.
 * Handles both string and numeric option values by converting to strings.
 */
const getSelectValue = (
  value: unknown,
  multiple?: boolean
): string | string[] => {
  if (multiple) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter(
        (v): v is string | number =>
          typeof v === "string" || typeof v === "number"
      )
      .map((v) => String(v));
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "";
};

/**
 * Sample select field component.
 *
 * Resolves its `options` via the library's `useSelectOptions` hook, so the same
 * component handles all three option shapes with no special-casing:
 *   - static    → `options: SelectOption[]`
 *   - data-map  → `options: { sourceField, labelPath?, valuePath? }`
 *   - resolver  → `options: { type: "resolver", name }` (sync or async)
 *
 * For dependent selects (`dependsOn`), the field is disabled until its parent
 * has a value; `useSelectOptions` re-resolves whenever the dependency changes.
 */
export const SelectField: BaseFieldComponent = ({
  field,
  fieldState,
  config: baseConfig,
  formValues,
}) => {
  const config = baseConfig as SelectFieldElement;
  const { options, isLoading } = useSelectOptions(config, field.name);

  // Disable a dependent select until its parent has a value (UX nicety).
  // Avoid `!parentValue` so valid falsy values (0, false) are not treated empty.
  const parentValue = config.dependsOn
    ? getNestedValue(formValues, config.dependsOn)
    : null;
  const isParentEmpty =
    parentValue === null || parentValue === undefined || parentValue === "";
  const isDisabled = Boolean(config.dependsOn && isParentEmpty);

  const placeholder = (() => {
    if (isLoading) {
      return "Loading…";
    }
    if (isDisabled) {
      return "Select country first...";
    }
    return "Select...";
  })();

  return (
    <div className="field-wrapper">
      {config.label && (
        <label className="field-label" htmlFor={field.name}>
          {config.label}
          {config.validation?.required && <span className="required">*</span>}
        </label>
      )}
      <select
        aria-busy={isLoading}
        aria-describedby={fieldState.error ? `${field.name}-error` : undefined}
        aria-invalid={fieldState.invalid}
        className={`field-input ${fieldState.error ? "field-input--error" : ""}`}
        disabled={isDisabled || isLoading}
        id={field.name}
        multiple={config.multiple}
        {...field}
        value={getSelectValue(field.value, config.multiple)}
      >
        {!config.multiple && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option
            disabled={option.disabled}
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
      {fieldState.error && (
        <span className="field-error" id={`${field.name}-error`} role="alert">
          {fieldState.error.message}
        </span>
      )}
    </div>
  );
};

SelectField.displayName = "SelectField";
