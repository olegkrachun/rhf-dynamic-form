import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { FieldErrors, UseFormReturn } from "react-hook-form";
import type { DynamicFormValidationApi } from "../context";
import type {
  FormData,
  OnDirtyChangeHandler,
  OnValidationChangeHandler,
} from "../types";
import { getNestedValue } from "../utils";
import { formValuesEqual } from "../utils/formValuesEqual";

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
    // Forms validated on mount already have an authoritative error tree. Do
    // not observe RHF's global isValid there: its unnamed broadcasts wake all
    // controllers and undo field-level rendering isolation. Forms that skip
    // mount validation still need RHF's initial validity signal because an
    // empty error tree does not prove that required fields are valid yet.
    const unsubscribeValidity = validateOnMount
      ? undefined
      : form.subscribe({
          formState: { isValid: true },
          callback: () => {
            // The state subject subscription below owns snapshot updates.
          },
        });
    const unsubscribe = form.subscribe({
      formState: { isDirty: true, dirtyFields: true },
      callback: ({ isDirty, dirtyFields }) => {
        const nextDirtyFields =
          (dirtyFields as Record<string, unknown> | undefined) ??
          stateRef.current.dirtyFields;
        const reportedIsDirty = isDirty ?? stateRef.current.isDirty;
        // RHF can re-broadcast a stale global isDirty=true from useFieldArray,
        // and its native deep comparison treats fields registered as explicit
        // `undefined` as different from absent default-value keys. Re-check
        // only this rare contradictory state so ordinary keystrokes do not pay
        // for a full form comparison.
        const nextIsDirty =
          reportedIsDirty && Object.keys(nextDirtyFields).length === 0
            ? !formValuesEqual(
                form.control._formValues,
                form.control._defaultValues
              )
            : reportedIsDirty;
        const nextState = {
          ...stateRef.current,
          isDirty: nextIsDirty,
          dirtyFields: nextDirtyFields,
        };
        stateRef.current = nextState;
        onDirtyChangeRef.current?.(nextState.isDirty, nextState.dirtyFields);
      },
    });
    const subjectSubscription = form.control._subjects.state.subscribe({
      next: (payload) => {
        if (!("errors" in payload) && typeof payload.isValid !== "boolean") {
          return;
        }
        // RHF state-subject payloads are patches. `payload.errors` can contain
        // only the field validated by the current interaction, so deriving
        // validity from it can incorrectly hide errors on other fields.
        const errors =
          "errors" in payload
            ? form.control._formState.errors
            : stateRef.current.errors;
        let isValid = stateRef.current.isValid;
        if (typeof payload.isValid === "boolean") {
          isValid = payload.isValid;
        } else if (validateOnMount) {
          // The initial trigger has seeded the complete resolver error tree,
          // so subsequent error broadcasts can derive validity without asking
          // RHF to publish global isValid updates.
          isValid = Object.keys(errors).length === 0;
        } else if (Object.keys(errors).length > 0) {
          isValid = false;
        }
        stateRef.current = {
          ...stateRef.current,
          errors,
          isValid,
        };
        for (const listener of listenersRef.current) {
          listener();
        }
      },
    });
    syncState();
    if (!validateOnMount) {
      form.control._setValid();
    }
    onDirtyChangeRef.current?.(
      stateRef.current.isDirty,
      stateRef.current.dirtyFields
    );
    return () => {
      unsubscribeValidity?.();
      unsubscribe();
      subjectSubscription.unsubscribe();
    };
  }, [form, syncState, validateOnMount]);

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
  const hasOnValidationChange = Boolean(onValidationChange);

  useEffect(() => {
    if (!hasOnValidationChange) {
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
  }, [hasOnValidationChange, validation]);

  return { stateRef, validation };
};
