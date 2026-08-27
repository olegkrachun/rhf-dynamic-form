import type React from "react";
import { useImperativeHandle } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { DynamicFormRef, FormData } from "../types";
import type { FormStateSnapshot } from "./useFormStateSnapshot";

interface UseDynamicFormHandleOptions {
  defaultValues: FormData;
  form: UseFormReturn<FormData>;
  ref?: React.Ref<DynamicFormRef>;
  stateRef: React.RefObject<FormStateSnapshot>;
}

export const useDynamicFormHandle = ({
  defaultValues,
  form,
  ref,
  stateRef,
}: UseDynamicFormHandleOptions) => {
  useImperativeHandle(
    ref,
    () => ({
      getValues: () => form.getValues(),
      setValue: (name: string, value: unknown) => form.setValue(name, value),
      watchAll: () => form.watch(),
      watchField: (name: string) => form.watch(name),
      reset: (values?: FormData) => form.reset(values ?? defaultValues),
      trigger: (name?: string) => form.trigger(name),
      getIsValid: () => stateRef.current.isValid,
      getErrors: () => stateRef.current.errors as Record<string, unknown>,
      getIsDirty: () => stateRef.current.isDirty,
      getDirtyFields: () => stateRef.current.dirtyFields,
    }),
    [defaultValues, form, stateRef]
  );
};
