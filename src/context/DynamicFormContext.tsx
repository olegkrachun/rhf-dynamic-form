import { createContext } from "react";
import type { UseFormReturn } from "react-hook-form";
import type {
  ComponentRegistry,
  FieldWrapperFunction,
  FormConfiguration,
  FormData,
} from "../types";

/**
 * The stable half of the form context: everything a renderer needs that does
 * not change when validation state changes.
 *
 * Kept in its own context so a validation pass does not invalidate it.
 * `DynamicForm` re-renders on every form-state change, and a new context
 * identity re-renders every consumer — in a large form that is every field, on
 * every keystroke that first dirties one.
 */
export interface DynamicFormControlValue {
  /**
   * react-hook-form methods.
   * Provides access to form state, validation, and control.
   */
  form: UseFormReturn<FormData>;

  /**
   * Parsed and validated form configuration.
   */
  config: FormConfiguration;

  /**
   * Unified component registry.
   * Contains fields, custom components, and container variants.
   */
  components: ComponentRegistry;

  /**
   * Current visibility state for all fields.
   * Maps field names to their visibility (true = visible).
   */
  visibility: Record<string, boolean>;

  /**
   * Optional wrapper function for each field.
   * When provided, every field is wrapped with this function.
   */
  fieldWrapper?: FieldWrapperFunction;
}

/**
 * The reactive half: validation state. Split out so subscribing to it is
 * opt-in — it is correct for a submit button and wasteful for a field.
 */
export interface DynamicFormValidationValue {
  /**
   * Current form validity state.
   * Reactive - updates when validation state changes.
   */
  isValid: boolean;

  /**
   * Current form errors.
   * Reactive - updates when validation state changes.
   *
   * Intentionally typed as `Record<string, unknown>` (not react-hook-form's
   * `FieldErrors`) to decouple the context interface from the form library.
   * Consumers who need structured error access can use `form.formState.errors`.
   */
  errors: Record<string, unknown>;
}

/**
 * Value returned by `useDynamicFormContext` — unchanged from previous versions:
 * the control slice plus validation state.
 */
export type DynamicFormContextValue = DynamicFormControlValue &
  DynamicFormValidationValue;

/**
 * Context for sharing form state and configuration with child components.
 *
 * This context is set up by the DynamicForm component and consumed by
 * field renderers and other internal components.
 */
export const DynamicFormContext = createContext<DynamicFormControlValue | null>(
  null
);

DynamicFormContext.displayName = "DynamicFormContext";

/**
 * Reactive validation state, provided alongside {@link DynamicFormContext}.
 */
export const DynamicFormValidationContext =
  createContext<DynamicFormValidationValue | null>(null);

DynamicFormValidationContext.displayName = "DynamicFormValidationContext";
