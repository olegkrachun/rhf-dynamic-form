import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { FieldErrors, UseFormReturn } from "react-hook-form";
import type { DynamicFormValidationApi } from "../context";
import type {
  FormData,
  OnDirtyChangeHandler,
  OnValidationChangeHandler,
} from "../types";
import { getNestedValue } from "../utils";

export interface FormStateSnapshot {
  errors: FieldErrors<FormData>;
  isValid: boolean;
  isDirty: boolean;
  dirtyFields: Record<string, unknown>;
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export const useFormStateSnapshot = (
  form: UseFormReturn<FormData>,
  validateOnMount: boolean,
  onValidationChange?: OnValidationChangeHandler,
  onDirtyChange?: OnDirtyChangeHandler
) => {
  const stateRef = useRef<FormStateSnapshot>({
    errors: {},
    isValid: false,
    isDirty: false,
    dirtyFields: {},
  });
  const listenersRef = useRef(new Set<() => void>());
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  const syncState = useCallback(() => {
    const state = form.control._formState;
    stateRef.current = {
      // Validation errors are synchronized by the state subject below. Keeping
      // them out of the public subscription avoids marking the whole form's
      // errors as globally observed; individual controllers already subscribe
      // to their own fieldState.error.
      errors: stateRef.current.errors,
      // Do not subscribe to RHF's global isValid. Its unnamed broadcasts wake
      // every useController; resolver errors are authoritative instead.
      isValid: stateRef.current.isValid,
      isDirty: state.isDirty,
      dirtyFields: state.dirtyFields as Record<string, unknown>,
    };
  }, [form]);

  useIsomorphicLayoutEffect(() => {
    const unsubscribe = form.subscribe({
      formState: { isDirty: true, dirtyFields: true },
      callback: ({ isDirty, dirtyFields }) => {
        const nextState = {
          ...stateRef.current,
          isDirty: isDirty ?? stateRef.current.isDirty,
          dirtyFields:
            (dirtyFields as Record<string, unknown> | undefined) ??
            stateRef.current.dirtyFields,
        };
        stateRef.current = nextState;
        onDirtyChangeRef.current?.(nextState.isDirty, nextState.dirtyFields);
      },
    });
    const subjectSubscription = form.control._subjects.state.subscribe({
      next: (payload) => {
        if (!("errors" in payload)) {
          return;
        }
        const errors = payload.errors ?? form.control._formState.errors;
        stateRef.current = {
          ...stateRef.current,
          errors,
          isValid: Object.keys(errors).length === 0,
        };
        for (const listener of listenersRef.current) {
          listener();
        }
      },
    });
    syncState();
    onDirtyChangeRef.current?.(
      stateRef.current.isDirty,
      stateRef.current.dirtyFields
    );
    return () => {
      unsubscribe();
      subjectSubscription.unsubscribe();
    };
  }, [form, syncState]);

  const validation = useRef<DynamicFormValidationApi>({
    getErrors: () => stateRef.current.errors as Record<string, unknown>,
    getFieldError: (name: string) =>
      getNestedValue(stateRef.current.errors, name),
    isFieldValid: (name: string) =>
      getNestedValue(stateRef.current.errors, name) === undefined,
    getIsValid: () => stateRef.current.isValid,
    subscribe: (listener: () => void) => {
      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    },
  }).current;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot on mount
  useEffect(() => {
    if (validateOnMount) {
      form.trigger();
    }
  }, []);

  const onValidationChangeRef = useRef(onValidationChange);
  onValidationChangeRef.current = onValidationChange;

  useEffect(() => {
    if (!onValidationChangeRef.current) {
      return;
    }
    const notify = () => {
      onValidationChangeRef.current?.(
        stateRef.current.errors,
        stateRef.current.isValid
      );
    };
    notify();
    return validation.subscribe(notify);
  }, [validation]);

  return { stateRef, validation };
};
