import type React from "react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
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
  invisibleFieldValidation = "skip",
  className,
  style,
  id,
  children,
  fieldWrapper,
  ref,
}: DynamicFormPropsWithRef): React.ReactElement => {
  const customComponents = components.custom ?? {};

  // Parse and validate configuration, including custom component props
  const parsedConfig = useMemo(() => {
    const parsed = parseConfiguration(config);
    return validateCustomComponents(parsed, customComponents);
  }, [config, customComponents]);

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

  useImperativeHandle(
    ref,
    () => ({
      getValues: () => form.getValues(),
      setValue: (name: string, value: unknown) => form.setValue(name, value),
      watchAll: () => form.watch(),
      watchField: (name: string) => form.watch(name),
      reset: (values?: FormData) => form.reset(values ?? defaultValues),
      trigger: (name?: string) => form.trigger(name),
      getIsValid: () => form.formState.isValid,
      getErrors: () => form.formState.errors,
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

  const { errors: formErrors, isValid: formIsValid } = useFormState({
    control: form.control,
  });

  useEffect(() => {
    if (!onValidationChange) {
      return;
    }
    onValidationChange(formErrors, formIsValid);
  }, [formErrors, formIsValid, onValidationChange]);

  const contextValue: DynamicFormContextValue = useMemo(
    () => ({
      form,
      config: parsedConfig,
      components,
      visibility,
      fieldWrapper,
      isValid: formIsValid,
      errors: formErrors as Record<string, unknown>,
    }),
    [
      form,
      parsedConfig,
      components,
      visibility,
      fieldWrapper,
      formIsValid,
      formErrors,
    ]
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
