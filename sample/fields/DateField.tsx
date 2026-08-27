import type { BaseFieldComponent } from "../../src";

const DISPLAY_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const NATIVE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const toNativeDate = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }
  const match = DISPLAY_DATE_PATTERN.exec(value);
  return match ? `${match[3]}-${match[1]}-${match[2]}` : value;
};

const fromNativeDate = (value: string) => {
  const match = NATIVE_DATE_PATTERN.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value;
};

/**
 * Sample date input field component.
 * This is a basic, unstyled implementation for testing and reference.
 */
export const DateField: BaseFieldComponent = ({
  field,
  fieldState,
  config,
}) => {
  return (
    <div className="field-wrapper">
      {config.label && (
        <label className="field-label" htmlFor={field.name}>
          {config.label}
          {config.validation?.required && <span className="required">*</span>}
        </label>
      )}
      <input
        aria-describedby={fieldState.error ? `${field.name}-error` : undefined}
        aria-invalid={fieldState.invalid}
        className={`field-input ${fieldState.error ? "field-input--error" : ""}`}
        id={field.name}
        name={field.name}
        onBlur={field.onBlur}
        onChange={(event) => field.onChange(fromNativeDate(event.target.value))}
        ref={field.ref}
        type="date"
        value={toNativeDate(field.value)}
      />
      {fieldState.error && (
        <span className="field-error" id={`${field.name}-error`} role="alert">
          {fieldState.error.message}
        </span>
      )}
    </div>
  );
};

DateField.displayName = "DateField";
