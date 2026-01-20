import { createContext } from "react";
import type { UseFormReturn } from "react-hook-form";
import type {
  CustomComponentRegistry,
  CustomContainerRegistry,
  FieldComponentRegistry,
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
   * Registered field components for each field type.
   * These are provided by the consuming application.
   */
  fieldComponents: FieldComponentRegistry;

  /**
   * Registered custom components.
   * These are referenced by name in 'custom' type elements.
   */
  customComponents: CustomComponentRegistry;

  /**
   * Registered custom container components (Phase 2).
   * These can be used to customize container layout rendering.
   */
  customContainers: CustomContainerRegistry;

  /**
   * Current visibility state for all fields (Phase 4).
   * Maps field names to their visibility (true = visible).
   * For Phase 1, all fields are always visible.
   */
  visibility: Record<string, boolean>;

  /**
   * Optional wrapper function for each field.
   * When provided, every field is wrapped with this function.
   */
  fieldWrapper?: FieldWrapperFunction;
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
