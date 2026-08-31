import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { UseFormReturn } from "react-hook-form";
import type { FormConfiguration, FormData, OnChangeHandler } from "../types";
import {
  buildDependencyMap,
  calculateVisibility,
  canAffectVisibility,
  collectVisibilityDependencies,
  findFieldByName,
  getFieldDefault,
  getNestedValue,
  getUpdatedVisibility,
  setNestedValue,
} from "../utils";

interface UseFormValueEffectsOptions {
  form: UseFormReturn<FormData>;
  config: FormConfiguration;
  onChange?: OnChangeHandler;
  setVisibility: Dispatch<SetStateAction<Record<string, boolean>>>;
}

export const useFormValueEffects = ({
  form,
  config,
  onChange,
  setVisibility,
}: UseFormValueEffectsOptions) => {
  const dependencyMap = useMemo(
    () => buildDependencyMap(config.elements),
    [config]
  );
  const visibilityDependencies = useMemo(
    () => collectVisibilityDependencies(config.elements),
    [config]
  );
  const previousValuesRef = useRef<Record<string, unknown>>(form.getValues());
  const resettingFieldsRef = useRef(new Set<string>());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const resetDependents = (
      fieldName: string,
      formValues: Record<string, unknown>
    ) => {
      const dependents = dependencyMap[fieldName];
      if (!dependents) {
        return;
      }
      const currentValue = getNestedValue(formValues, fieldName);
      const previousValue = getNestedValue(
        previousValuesRef.current,
        fieldName
      );
      if (currentValue === previousValue) {
        return;
      }
      setNestedValue(previousValuesRef.current, fieldName, currentValue);
      for (const dependent of dependents) {
        const field = findFieldByName(config.elements, dependent);
        if (field && field.resetOnParentChange !== false) {
          resettingFieldsRef.current.add(dependent);
          form.setValue(dependent, getFieldDefault(field), {
            shouldDirty: true,
          });
        }
      }
    };

    const subscription = form.watch((values, { name }) => {
      const formValues = values as Record<string, unknown>;
      if (!name || canAffectVisibility(name, visibilityDependencies)) {
        const nextVisibility = calculateVisibility(config.elements, formValues);
        setVisibility((current) =>
          getUpdatedVisibility(current, nextVisibility)
        );
      }
      if (!name) {
        previousValuesRef.current = formValues;
        return;
      }
      if (resettingFieldsRef.current.delete(name)) {
        return;
      }
      resetDependents(name, formValues);
      onChangeRef.current?.(values as FormData, name);
    });

    return () => subscription.unsubscribe();
  }, [config, dependencyMap, form, setVisibility, visibilityDependencies]);
};
