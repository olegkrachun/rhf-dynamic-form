import type React from "react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FieldErrors } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { FormRenderer } from "./components";
import {
  DynamicFormContext,
  type DynamicFormContextValue,
  type DynamicFormValidationApi,
} from "./context";
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

interface DynamicFormPropsWithRef extends DynamicFormProps {
  ref?: React.Ref<DynamicFormRef>;
}

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

  // Form state is tracked without subscribing this component. `useFormState`
  // here would re-render the whole form on every keystroke and every
  // validation pass; `form.subscribe` delivers the same updates outside
  // React's render cycle. Fields get their own state through `useController`,
  // so nothing above them needs to re-render at all.
  const formStateRef = useRef<{
    errors: FieldErrors<FormData>;
    isValid: boolean;
    isDirty: boolean;
    dirtyFields: Record<string, unknown>;
  }>({ errors: {}, isValid: false, isDirty: false, dirtyFields: {} });

  const validationListenersRef = useRef(new Set<() => void>());

  useEffect(
    () =>
      form.subscribe({
        formState: {
          errors: true,
          isValid: true,
          isDirty: true,
          dirtyFields: true,
        },
        callback: (state) => {
          formStateRef.current = {
            errors: state.errors ?? {},
            isValid: state.isValid ?? false,
            isDirty: state.isDirty ?? false,
            dirtyFields: (state.dirtyFields ?? {}) as Record<string, unknown>,
          };
          for (const listener of validationListenersRef.current) {
            listener();
          }
        },
      }),
    [form]
  );

  const validation = useRef<DynamicFormValidationApi>({
    getErrors: () => formStateRef.current.errors as Record<string, unknown>,
    getFieldError: (name: string) =>
      getNestedValue(formStateRef.current.errors, name),
    isFieldValid: (name: string) =>
      getNestedValue(formStateRef.current.errors, name) === undefined,
    getIsValid: () => formStateRef.current.isValid,
    subscribe: (listener: () => void) => {
      validationListenersRef.current.add(listener);
      return () => {
        validationListenersRef.current.delete(listener);
      };
    },
  }).current;

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
      getErrors: () => formStateRef.current.errors as Record<string, unknown>,
      getIsDirty: () => formStateRef.current.isDirty,
      getDirtyFields: () => formStateRef.current.dirtyFields,
    }),
    [form, defaultValues]
  );

  const dependencyMap = useMemo(
    () => buildDependencyMap(parsedConfig.elements),
    [parsedConfig]
  );

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
      onChangeRef.current?.(values as FormData, name);
    });

    return () => subscription.unsubscribe();
  }, [form, parsedConfig, dependencyMap]);

  const onValidationChangeRef = useRef(onValidationChange);
  onValidationChangeRef.current = onValidationChange;

  useEffect(() => {
    if (!onValidationChangeRef.current) {
      return;
    }

    const notify = () => {
      onValidationChangeRef.current?.(
        formStateRef.current.errors,
        formStateRef.current.isValid
      );
    };

    notify();
    return validation.subscribe(notify);
  }, [validation]);

  const contextValue: DynamicFormContextValue = useMemo(
    () => ({
      form,
      config: parsedConfig,
      components,
      visibility,
      fieldWrapper,
      validation,
    }),
    [form, parsedConfig, components, visibility, fieldWrapper, validation]
  );

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
