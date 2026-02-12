import type { BaseFieldComponent } from "../../src";

/**
 * Sample email input field component.
 * This is a basic, unstyled implementation for testing and reference.
 */
export const EmailField: BaseFieldComponent = ({
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
        placeholder={config.placeholder}
        type="email"
        {...field}
      />
      {fieldState.error && (
        <span className="field-error" id={`${field.name}-error`} role="alert">
          {fieldState.error.message}
        </span>
      )}
    </div>
  );
};

EmailField.displayName = "EmailField";
