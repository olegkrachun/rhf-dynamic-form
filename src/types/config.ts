import type { CSSProperties } from "react";
import type { FormElement } from "./elements";
import type {
  FormData,
  OnChangeHandler,
  OnErrorHandler,
  OnResetHandler,
  OnSubmitHandler,
  OnValidationChangeHandler,
} from "./events";
import type {
  CustomComponentRegistry,
  CustomContainerRegistry,
  FieldComponentRegistry,
} from "./fields";
import type { InvisibleFieldValidation } from "./validation";

/**
 * Custom component definition for advanced configuration.
 */
export interface CustomComponentDefinition {
  /** Default props to apply to the custom component */
  defaultProps?: Record<string, unknown>;
}

/**
 * Root form configuration object.
 * This is the JSON structure that defines the entire form.
 *
 * @example
 * ```json
 * {
 *   "name": "Contact Form",
 *   "elements": [
 *     { "type": "text", "name": "source.name", "label": "Name" },
 *     { "type": "email", "name": "source.email", "label": "Email" }
 *   ]
 * }
 * ```
 */
export interface FormConfiguration {
  /** Optional name/identifier for the form */
  name?: string;

  /** Array of form elements (fields and layouts) */
  elements: FormElement[];

  /** Custom component definitions (for advanced use) */
  customComponents?: Record<string, CustomComponentDefinition>;
}

/**
 * Props for the DynamicForm component.
 *
 * @example
 * ```tsx
 * <DynamicForm
 *   config={formConfig}
 *   fieldComponents={myFieldComponents}
 *   onSubmit={(data) => console.log(data)}
 *   onChange={(data, field) => console.log(`${field} changed`)}
 * />
 * ```
 */
export interface DynamicFormProps {
  /** Form configuration - defines structure, fields, and validation */
  config: FormConfiguration;

  /** Initial form data to populate fields */
  initialData?: FormData;

  /** Required: Field component implementations for each field type */
  fieldComponents: FieldComponentRegistry;

  /** Optional: Custom field components referenced by name in config */
  customComponents?: CustomComponentRegistry;

  /** Optional: Custom container components for layout customization (Phase 2) */
  customContainers?: CustomContainerRegistry;

  /** Called on successful form submission with valid data */
  onSubmit: OnSubmitHandler;

  /** Called when any field value changes */
  onChange?: OnChangeHandler;

  /** Called when validation state changes */
  onValidationChange?: OnValidationChangeHandler;

  /** Called when form is reset */
  onReset?: OnResetHandler;

  /** Called on submission errors (validation failures) */
  onError?: OnErrorHandler;

  /**
   * Validation mode for react-hook-form.
   * - 'onChange': Validate on every change (default)
   * - 'onBlur': Validate on blur
   * - 'onSubmit': Only validate on submit
   * - 'onTouched': Validate on blur, then on every change
   * - 'all': Validate on blur and change
   */
  mode?: "onChange" | "onBlur" | "onSubmit" | "onTouched" | "all";

  /**
   * Controls validation behavior for invisible fields (Phase 3).
   * - 'skip': Do not validate invisible fields (default)
   * - 'validate': Validate all fields regardless of visibility
   * - 'warn': Validate but treat errors as warnings (non-blocking)
   */
  invisibleFieldValidation?: InvisibleFieldValidation;

  /** CSS class name for the form element */
  className?: string;

  /** Inline styles for the form element */
  style?: CSSProperties;

  /** HTML id attribute for the form element */
  id?: string;

  /** Content to render after all form fields (e.g., submit button) */
  children?: React.ReactNode;
}
