import { createContext } from "react";
import type { UseFormReturn } from "react-hook-form";
import type {
  ComponentRegistry,
  FieldWrapperFunction,
  FormConfiguration,
  FormData,
} from "../types";

/**
 * Value provided by the DynamicFormContext.
 * Contains everything needed by child components to render and interact with the form.
 */
export interface DynamicFormContextValue {
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
   * Contains fields, custom components, containers, and column component.
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

  /**
   * Current form validity state.
   * Reactive - updates when validation state changes.
   */
  isValid: boolean;

  /**
   * Current form errors.
   * Reactive - updates when validation state changes.
   */
  errors: Record<string, unknown>;
}

/**
 * Context for sharing form state and configuration with child components.
 *
 * This context is set up by the DynamicForm component and consumed by
 * field renderers and other internal components.
 */
export const DynamicFormContext = createContext<DynamicFormContextValue | null>(
  null
);

DynamicFormContext.displayName = "DynamicFormContext";
