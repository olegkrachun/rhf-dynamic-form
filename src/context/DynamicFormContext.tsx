import { createContext } from "react";
import type { UseFormReturn } from "react-hook-form";
import type {
  ComponentRegistry,
  FieldWrapperFunction,
  FormConfiguration,
  FormData,
} from "../types";

/**
 * Pull-based access to validation state.
 *
 * Errors are not published as a context value on purpose. A value changes
 * identity on every validation pass, and a changed context re-renders every
 * consumer — in a large form that is every field, none of which needs the
 * validity of the form as a whole. Its own error already arrives through
 * `useController`.
 *
 * These accessors read the current state on demand and never change identity,
 * so holding them costs nothing. Reactivity is opt-in through
 * {@link DynamicFormValidationApi.subscribe} — pass it to `useSyncExternalStore`,
 * or call it from an effect and keep what you need in local state.
 *
 * @example
 * ```tsx
 * const { validation } = useDynamicFormContext();
 *
 * // Read on demand — no subscription, no re-render.
 * const submit = () => {
 *   if (validation.getIsValid()) { ... }
 * };
 *
 * // Opt into re-rendering, in the one place that needs it.
 * const isValid = useSyncExternalStore(validation.subscribe, validation.getIsValid);
 * ```
 */
export interface DynamicFormValidationApi {
  /** Current form errors, keyed by field name. */
  getErrors: () => Record<string, unknown>;

  /** Current error for a single field, or `undefined` when it has none. */
  getFieldError: (name: string) => unknown;

  /** Whether a single field currently has no error. */
  isFieldValid: (name: string) => boolean;

  /** Whether the form as a whole is currently valid. */
  getIsValid: () => boolean;

  /**
   * Register a listener fired after every validation pass. Returns the
   * unsubscribe function.
   *
   * The listener runs outside React's render cycle — nothing re-renders
   * unless the listener itself asks for it.
   */
  subscribe: (listener: () => void) => () => void;
}

/** Reactive validation state returned by useDynamicFormValidation. */
export interface DynamicFormValidationValue {
  /** Whether the form as a whole is currently valid. */
  isValid: boolean;

  /** Current form errors, keyed by field name. */
  errors: Record<string, unknown>;
}

/**
 * Value provided by the DynamicFormContext.
 * Contains everything needed by child components to render and interact with the form.
 *
 * Every member has a stable identity for the lifetime of the form, so a
 * validation pass or a keystroke never invalidates this context.
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

  /**
   * Pull-based validation state. See {@link DynamicFormValidationApi}.
   */
  validation: DynamicFormValidationApi;
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
