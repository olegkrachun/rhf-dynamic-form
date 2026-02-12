import type { BaseFieldComponent } from "../../src";

/**
 * Sample boolean (checkbox) field component.
 * This is a basic, unstyled implementation for testing and reference.
 */
export const BooleanField: BaseFieldComponent = ({
  field,
  fieldState,
  config,
}) => {
  return (
    <div className="field-wrapper field-wrapper--checkbox">
      <label className="field-label field-label--checkbox">
        <input
          aria-describedby={
            fieldState.error ? `${field.name}-error` : undefined
          }
          aria-invalid={fieldState.invalid}
          checked={field.value as boolean}
          className={`field-checkbox ${fieldState.error ? "field-checkbox--error" : ""}`}
          name={field.name}
          onBlur={field.onBlur}
          onChange={(e) => field.onChange(e.target.checked)}
          ref={field.ref}
          type="checkbox"
        />
        <span className="checkbox-label-text">
          {config.label}
          {config.validation?.required && <span className="required">*</span>}
        </span>
      </label>
      {fieldState.error && (
        <span className="field-error" id={`${field.name}-error`} role="alert">
          {fieldState.error.message}
        </span>
      )}
    </div>
  );
};

BooleanField.displayName = "BooleanField";
