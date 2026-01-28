import type { CSSProperties, ReactNode } from "react";
import type { ControllerFieldState } from "react-hook-form";
import type {
  CustomComponentDefinition,
  CustomComponentRegistry,
} from "../customComponents";
import type { FieldElement, FormElement } from "./elements";

import type {
  FormData,
  OnChangeHandler,
  OnErrorHandler,
  OnResetHandler,
  OnSubmitHandler,
  OnValidationChangeHandler,
} from "./events";
import type { CustomContainerRegistry, FieldComponentRegistry } from "./fields";
import type { InvisibleFieldValidation } from "./validation";

/**
 * Props passed to the fieldWrapper function.
 * Contains field metadata for custom wrapper implementations.
 */
export interface FieldWrapperProps {
  /** Field path (e.g., "contact.email") */
  name: string;

  /** Raw field configuration from form config */
  config: FieldElement;

  /** react-hook-form field state (error, isDirty, isTouched, invalid) */
  fieldState: ControllerFieldState;

  /** Current field value */
  value: unknown;

  /** All current form values (for reading other fields) */
  formValues: FormData;

  /** Set any field value (for dependent field logic) */
  setValue: (name: string, value: unknown) => void;
}

/**
 * Function type for wrapping field components.
 * Receives field metadata and the rendered field element.
 *
 * @example
 * ```tsx
 * const myFieldWrapper: FieldWrapperFunction = (props, children) => (
 *   <div className="field-wrapper">
 *     <Badge>{props.name}</Badge>
 *     {children}
 *   </div>
 * );
 * ```
 */
export type FieldWrapperFunction = (
  props: FieldWrapperProps,
  children: ReactNode
) => ReactNode;

// Note: CustomComponentDefinition is exported from customComponents module
// for full definition support with propsSchema validation

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
   * Controls validation behavior for invisible fields.
   * Only applies when using `schema` prop (not custom `resolver`).
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

  /**
   * Optional wrapper function for each field.
   * Receives field metadata and children, returns wrapped element.
   * Use this for adding confidence indicators, status badges, edit tracking, etc.
   *
   * @example
   * ```tsx
   * <DynamicForm
   *   fieldWrapper={(props, children) => (
   *     <div className="field-wrapper">
   *       <Badge>{props.config.label}</Badge>
   *       {children}
   *     </div>
   *   )}
   * />
   * ```
   */
  fieldWrapper?: FieldWrapperFunction;
}

/**
 * Ref interface for external form control.
 * Access form methods from outside the component.
 *
 * @example
 * ```tsx
 * const formRef = useRef<DynamicFormRef>(null);
 *
 * // Reset city when country changes externally
 * const handleCountryChange = (country: string) => {
 *   formRef.current?.setValue('country', country);
 *   formRef.current?.setValue('city', null);
 * };
 *
 * <DynamicForm ref={formRef} ... />
 * ```
 */
export interface DynamicFormRef {
  /** Get all form values */
  getValues: () => FormData;

  /** Set a specific field value */
  setValue: (name: string, value: unknown) => void;

  /** Watch all form values reactively */
  watchAll: () => FormData;

  /** Watch a specific field value reactively */
  watchField: (name: string) => unknown;

  /** Reset form to initial values or provided values */
  reset: (values?: FormData) => void;

  /** Trigger validation for a specific field or all fields */
  trigger: (name?: string) => Promise<boolean>;
}
