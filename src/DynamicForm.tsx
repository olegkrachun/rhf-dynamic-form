import type React from "react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Control, FieldErrors } from "react-hook-form";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import { FormRenderer } from "./components";
import { DynamicFormContext, type DynamicFormContextValue } from "./context";
import { validateCustomComponents } from "./customComponents";
import { parseConfiguration } from "./parser";
import { createVisibilityAwareResolver } from "./resolver";
import { generateZodSchema } from "./schema";
import type { DynamicFormProps, DynamicFormRef, FormData } from "./types";
import {
  buildDependencyMap,
  calculateVisibility,
  findFieldByName,
  getFieldDefault,
  getNestedValue,
  getUpdatedVisibility,
  hasFallbackComponent,
  mergeDefaults,
  setNestedValue,
} from "./utils";
import {
  applyDependentErrors,
  buildReverseValidationDeps,
  getValidationDependents,
} from "./validation/reverseValidationDeps";

/** Minimal resolver options; the visibility-aware resolver ignores the rest. */
const RESOLVER_OPTIONS = { fields: {}, shouldUseNativeValidation: false };

interface DynamicFormPropsWithRef extends DynamicFormProps {
  ref?: React.Ref<DynamicFormRef>;
}

interface FormStateSnapshot {
  errors: FieldErrors<FormData>;
  isValid: boolean;
  isDirty: boolean;
  dirtyFields: Record<string, unknown>;
}

/**
 * The only reactive form-state subscriber the engine holds, kept in a
 * null-rendering child so validation churn re-renders this component alone —
 * not the root, not the context value, not the element tree. The root reads
 * the latest values imperatively through `snapshotRef`, so everything it
 * exposes keeps the same values: the ref API is already getters, and the
 * context serves `isValid` / `errors` as getters over this same snapshot.
 *
 * `isValid` is deliberately NOT subscribed. RHF broadcasts a validity flip
 * with NO field name, which wakes every controller in the form — measured at
 * 299 of 300 array cells per keystroke. Validity is derived from the
 * resolver's own output instead: the schema validates the whole form on every
 * run, so "no errors" IS validity. That holds because dependents are
 * re-validated by name on every change (see `reverseValidationDeps`).
 */
const FormStateObserver = ({
  control,
  snapshotRef,
  onValidationChange,
}: {
  control: Control<FormData>;
  snapshotRef: React.RefObject<FormStateSnapshot>;
  onValidationChange?: DynamicFormProps["onValidationChange"];
}) => {
  const { errors, isDirty, dirtyFields } = useFormState({ control });
  const isValid = Object.keys(errors).length === 0;

  snapshotRef.current = {
    errors,
    isValid,
    isDirty,
    dirtyFields: dirtyFields as Record<string, unknown>,
  };

  useEffect(() => {
    onValidationChange?.(errors, isValid);
  }, [errors, isValid, onValidationChange]);

  return null;
};

export const DynamicForm = ({
  config,
  initialData,
  components,
  onSubmit,
  onChange,
  onValidationChange,
  onReset,
  onError,
  mode = "onChange",
  validateOnMount = false,
  invisibleFieldValidation = "skip",
  className,
  style,
  id,
  children,
  fieldWrapper,
  ref,
}: DynamicFormPropsWithRef): React.ReactElement => {
  const customComponents = components.custom ?? {};
  const allowMissingCustomComponents = hasFallbackComponent(
    components.fallback,
    "custom"
  );

  // Parse and validate configuration, including custom component props
  const parsedConfig = useMemo(() => {
    const parsed = parseConfiguration(config);
    return validateCustomComponents(parsed, customComponents, {
      allowMissingCustomComponents,
    });
  }, [config, customComponents, allowMissingCustomComponents]);

  const zodSchema = useMemo(
    () => generateZodSchema(parsedConfig),
    [parsedConfig]
  );

  const defaultValues = useMemo(
    () => mergeDefaults(parsedConfig, initialData),
    [parsedConfig, initialData]
  );

  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    calculateVisibility(
      parsedConfig.elements,
      defaultValues as Record<string, unknown>
    )
  );

  // Refs for stable closure access (prevents stale closures in subscriptions)
  const visibilityRef = useRef(visibility);
  visibilityRef.current = visibility;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const resolver = useMemo(
    () =>
      createVisibilityAwareResolver({
        schema: zodSchema,
        getVisibility: () => visibilityRef.current,
        invisibleFieldValidation,
      }),
    [zodSchema, invisibleFieldValidation]
  );

  const form = useForm<FormData>({ defaultValues, resolver, mode });
  // Latest form state, written by <FormStateObserver>. Starts invalid, which
  // matches react-hook-form's own initial value before anything is validated.
  const formStateRef = useRef<FormStateSnapshot>({
    errors: {},
    isValid: false,
    isDirty: false,
    dirtyFields: {},
  });

  // Run validation once after mount so pre-filled invalid values surface
  // errors immediately. Empty deps array — fires per mount, not per render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot on mount
  useEffect(() => {
    if (validateOnMount) {
      form.trigger();
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getValues: () => form.getValues(),
      setValue: (name: string, value: unknown) => form.setValue(name, value),
      watchAll: () => form.watch(),
      watchField: (name: string) => form.watch(name),
      reset: (values?: FormData) => form.reset(values ?? defaultValues),
      trigger: (name?: string) => form.trigger(name),
      getIsValid: () => formStateRef.current.isValid,
      getErrors: () => formStateRef.current.errors,
      getIsDirty: () => formStateRef.current.isDirty,
      getDirtyFields: () => formStateRef.current.dirtyFields,
    }),
    [form, defaultValues]
  );

  const dependencyMap = useMemo(
    () => buildDependencyMap(parsedConfig.elements),
    [parsedConfig]
  );

  const reverseValidationDeps = useMemo(
    () => buildReverseValidationDeps(parsedConfig.elements),
    [parsedConfig]
  );

  /**
   * Generation stamp for the dependent re-validation pass — only the newest
   * pass may write, so a slow earlier one cannot land a stale verdict.
   */
  const dependentPassRef = useRef(0);

  const previousValuesRef = useRef<Record<string, unknown>>({});

  /**
   * Set of field names currently being reset by the dependency system.
   * Watch events for these fields are suppressed to avoid duplicate onChange calls.
   */
  const resettingFieldsRef = useRef<Set<string>>(new Set());

  // Single watch subscription: visibility + dependency resets + onChange
  useEffect(() => {
    const handleDependencyReset = (
      fieldName: string,
      formValues: Record<string, unknown>
    ) => {
      const dependents = dependencyMap[fieldName];
      if (!dependents) {
        return;
      }

      // Use getNestedValue for nested paths like "source.country"
      const currentValue = getNestedValue(formValues, fieldName);
      const previousValue = getNestedValue(
        previousValuesRef.current,
        fieldName
      );
      if (currentValue === previousValue) {
        return;
      }

      // Update previousValuesRef using setNestedValue for nested paths
      setNestedValue(previousValuesRef.current, fieldName, currentValue);
      for (const dep of dependents) {
        const field = findFieldByName(parsedConfig.elements, dep);
        if (field && field.resetOnParentChange !== false) {
          resettingFieldsRef.current.add(dep);
          form.setValue(dep, getFieldDefault(field));
        }
      }
    };

    const subscription = form.watch((values, { name }) => {
      const formValues = values as Record<string, unknown>;

      const newVisibility = calculateVisibility(
        parsedConfig.elements,
        formValues
      );
      setVisibility((prev) => getUpdatedVisibility(prev, newVisibility));

      if (!name) {
        return;
      }

      // Skip onChange for programmatic dependency resets to avoid duplicates
      if (resettingFieldsRef.current.has(name)) {
        resettingFieldsRef.current.delete(name);
        return;
      }

      handleDependencyReset(name, formValues);

      const dependents = getValidationDependents(
        reverseValidationDeps,
        name,
        (path) => form.getValues(path)
      );
      if (dependents.length > 0) {
        dependentPassRef.current += 1;
        const pass = dependentPassRef.current;
        // `resolver` may answer synchronously or with a promise; normalise.
        Promise.resolve(
          resolver(form.getValues(), undefined, RESOLVER_OPTIONS as never)
        ).then((result) => {
          if (pass !== dependentPassRef.current) {
            return;
          }
          applyDependentErrors(
            dependents,
            (result.errors ?? {}) as Record<string, unknown>,
            form,
            getNestedValue
          );
        });
      }

      onChangeRef.current?.(values as FormData, name);
    });

    return () => subscription.unsubscribe();
  }, [form, parsedConfig, dependencyMap, reverseValidationDeps, resolver]);

  // `isValid` / `errors` stay on the context, but as getters over the
  // snapshot: consumers read the same values while the object IDENTITY stops
  // changing on validation churn — that identity was re-rendering every
  // context consumer, and through them every array row, on each keystroke.
  const contextValue: DynamicFormContextValue = useMemo(() => {
    const value = {
      form,
      config: parsedConfig,
      components,
      visibility,
      fieldWrapper,
    } as DynamicFormContextValue;
    Object.defineProperties(value, {
      isValid: { enumerable: true, get: () => formStateRef.current.isValid },
      errors: {
        enumerable: true,
        get: () => formStateRef.current.errors as Record<string, unknown>,
      },
    });
    return value;
  }, [form, parsedConfig, components, visibility, fieldWrapper]);

  const handleSubmit = form.handleSubmit(onSubmit, (errors) =>
    onError?.(errors)
  );

  const handleReset = useCallback(() => {
    form.reset(defaultValues);
    onReset?.();
  }, [defaultValues, onReset, form]);

  return (
    <FormProvider {...form}>
      <DynamicFormContext.Provider value={contextValue}>
        <FormStateObserver
          control={form.control}
          onValidationChange={onValidationChange}
          snapshotRef={formStateRef}
        />
        <form
          className={className}
          id={id}
          noValidate
          onReset={handleReset}
          onSubmit={handleSubmit}
          style={style}
        >
          <FormRenderer elements={parsedConfig.elements} />
          {children}
        </form>
      </DynamicFormContext.Provider>
    </FormProvider>
  );
};

DynamicForm.displayName = "DynamicForm";

export default DynamicForm;
