import type { SelectFieldComponent, SelectOption } from "../../src";
import { getNestedValue } from "../../src";

/**
 * Demo: City options grouped by country.
 * In real app this would come from API via optionsSource resolver.
 */
const cityOptionsByCountry: Record<string, SelectOption[]> = {
  ua: [
    { value: "kyiv", label: "Kyiv" },
    { value: "lviv", label: "Lviv" },
    { value: "odesa", label: "Odesa" },
  ],
  us: [
    { value: "nyc", label: "New York" },
    { value: "la", label: "Los Angeles" },
    { value: "chicago", label: "Chicago" },
  ],
  de: [
    { value: "berlin", label: "Berlin" },
    { value: "munich", label: "Munich" },
  ],
  pl: [
    { value: "warsaw", label: "Warsaw" },
    { value: "krakow", label: "Krakow" },
  ],
};

/**
 * Sample select field component.
 * This is a basic, unstyled implementation for testing and reference.
 * Supports dependsOn for cascading selects.
 */
export const SelectField: SelectFieldComponent = ({
  field,
  fieldState,
  config,
  formValues,
}) => {
  // Get parent value if dependsOn is set
  const parentValue = config.dependsOn
    ? getNestedValue(formValues, config.dependsOn)
    : null;

  // Filter options based on parent value (demo implementation)
  let options = config.options;
  if (config.dependsOn) {
    if (!parentValue) {
      // No parent value - show no options
      options = [];
    } else if (field.name === "source.city") {
      // Demo: filter cities by country
      options = cityOptionsByCountry[parentValue as string] ?? [];
    }
  }

  const isDisabled = Boolean(config.dependsOn && !parentValue);

  return (
    <div className="field-wrapper">
      {config.label && (
        <label className="field-label" htmlFor={field.name}>
          {config.label}
          {config.validation?.required && <span className="required">*</span>}
        </label>
      )}
      <select
        aria-describedby={fieldState.error ? `${field.name}-error` : undefined}
        aria-invalid={fieldState.invalid}
        className={`field-input ${fieldState.error ? "field-input--error" : ""}`}
        disabled={isDisabled}
        id={field.name}
        multiple={config.multiple}
        {...field}
        value={field.value ?? ""}
      >
        {!config.multiple && (
          <option value="">
            {isDisabled ? "Select country first..." : "Select..."}
          </option>
        )}
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
