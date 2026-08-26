import { useContext, useMemo } from "react";
import {
  DynamicFormContext,
  type DynamicFormContextValue,
  type DynamicFormControlValue,
  DynamicFormValidationContext,
  type DynamicFormValidationValue,
} from "@/context";

const OUTSIDE_FORM =
  "must be used within a DynamicForm component. " +
  "Make sure your component is a child of <DynamicForm>.";

/**
 * Access the stable half of the context: form methods, configuration, component
 * registry, visibility and the field wrapper.
 *
 * Prefer this over {@link useDynamicFormContext} in anything that renders per
 * field — it does not subscribe to validation, so a validation pass does not
 * re-render the consumer.
 */
export const useDynamicFormControl = (): DynamicFormControlValue => {
  const control = useContext(DynamicFormContext);
  if (!control) {
    throw new Error(`useDynamicFormControl ${OUTSIDE_FORM}`);
  }
  return control;
};

/** Same as {@link useDynamicFormControl}, but returns null outside a form. */
export const useDynamicFormControlSafe = (): DynamicFormControlValue | null =>
  useContext(DynamicFormContext);

/**
 * Access reactive validation state. Subscribing re-renders the consumer on
 * every validation pass, so use it only where that is the point.
 */
export const useDynamicFormValidation = (): DynamicFormValidationValue => {
  const validation = useContext(DynamicFormValidationContext);
  if (!validation) {
    throw new Error(`useDynamicFormValidation ${OUTSIDE_FORM}`);
  }
  return validation;
};

/**
 * Hook to access the DynamicForm context.
 *
 * Must be used within a DynamicForm component.
 * Throws an error if used outside of the form context.
 *
 * @returns The DynamicFormContext value
 * @throws Error if used outside of DynamicForm
 *
 * @example
 * ```tsx
 * function MyCustomField({ config }) {
 *   const { form, components } = useDynamicFormContext();
 *
 *   const value = form.watch(config.name);
 *   // ... render field
 * }
 * ```
 */
export const useDynamicFormContext = (): DynamicFormContextValue => {
  const control = useDynamicFormControl();
  const validation = useDynamicFormValidation();

  return useMemo(() => ({ ...control, ...validation }), [control, validation]);
};

/**
 * Hook to safely access the DynamicForm context.
 * Returns null if used outside of the form context instead of throwing.
 *
 * @returns The DynamicFormContext value or null
 *
 * @example
 * ```tsx
 * function MaybeInForm() {
 *   const context = useDynamicFormContextSafe();
 *
 *   if (!context) {
 *     return <span>Not in a form</span>;
 *   }
 *
 *   return <span>In a form!</span>;
 * }
 * ```
 */
export const useDynamicFormContextSafe = (): DynamicFormContextValue | null => {
  const control = useContext(DynamicFormContext);
  const validation = useContext(DynamicFormValidationContext);

  return useMemo(
    () => (control && validation ? { ...control, ...validation } : null),
    [control, validation]
  );
};
