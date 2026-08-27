import type { FieldErrors } from "react-hook-form";

/**
 * Form data type - a generic record for form values.
 * Values are nested according to dot-notation field names.
 *
 * @example
 * ```typescript
 * // For field name "source.name", data will be:
 * { source: { name: "John" } }
 * ```
 */
export type FormData = Record<string, unknown>;

/**
 * Handler called when form is submitted with valid data.
 */
export type OnSubmitHandler = (data: FormData) => void | Promise<void>;

/**
 * Handler called when form values change.
 *
 * @param data - Current form data
 * @param changedField - The name of the field that changed
 */
export type OnChangeHandler = (data: FormData, changedField: string) => void;

/**
 * Handler called when validation state changes.
 *
 * @param errors - Current validation errors
 * @param isValid - Whether the form is currently valid
 */
export type OnValidationChangeHandler = (
  errors: FieldErrors,
  isValid: boolean
) => void;

/**
 * Handler called with one consistent snapshot whenever dirty state changes.
 */
export type OnDirtyChangeHandler = (
  isDirty: boolean,
  dirtyFields: Record<string, unknown>
) => void;

/**
 * Handler called when form is reset.
 */
export type OnResetHandler = () => void;

/**
 * Handler called on form submission errors.
 *
 * @param errors - Validation errors that prevented submission
 */
export type OnErrorHandler = (errors: FieldErrors) => void;
