import { useContext, useMemo } from "react";
import { useFormState } from "react-hook-form";
import { DynamicFormContext, type DynamicFormContextValue } from "@/context";

const useRequiredDynamicFormContext = (): DynamicFormContextValue => {
  const context = useContext(DynamicFormContext);

  if (!context) {
    throw new Error(
      "useDynamicFormContext must be used within a DynamicForm component. " +
        "Make sure your component is a child of <DynamicForm>."
    );
  }

  return context;
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
  const context = useRequiredDynamicFormContext();
  const { errors, isValid } = useFormState({ control: context.form.control });

  return useMemo(
    () => ({
      ...context,
      errors: errors as Record<string, unknown>,
      isValid,
    }),
    [context, errors, isValid]
  );
};

/** Internal stable access that deliberately does not subscribe to form state. */
export const useDynamicFormInternalContext = useRequiredDynamicFormContext;

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
  return useContext(DynamicFormContext);
};
