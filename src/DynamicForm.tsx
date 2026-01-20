import type React from "react";
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { FormProvider, useForm } from "react-hook-form";
import { FormRenderer } from "./components";
import { DynamicFormContext, type DynamicFormContextValue } from "./context";
import { parseConfiguration } from "./parser";
import { createVisibilityAwareResolver } from "./resolver";
import { generateZodSchema } from "./schema";
import type { DynamicFormProps, DynamicFormRef, FormData } from "./types";
import {
  buildDependencyMap,
  calculateVisibility,
  findFieldByName,
  getFieldDefault,
  mergeDefaults,
} from "./utils";

/**
 * Props for the DynamicForm component including ref support.
 */
interface DynamicFormPropsWithRef extends DynamicFormProps {
  /** Ref to access form methods externally */
  ref?: React.Ref<DynamicFormRef>;
}

/**
 * DynamicForm - A configuration-driven form component.
 *
 * Renders a complete form from JSON configuration, handling:
 * - Field rendering via provided field components
 * - Validation via dynamically generated Zod schemas
 * - Form state management via react-hook-form
 * - Event callbacks for changes and submissions
 *
 * @example
 * ```tsx
 * const config = {
 *   elements: [
 *     { type: 'text', name: 'source.name', label: 'Name', validation: { required: true } },
 *     { type: 'email', name: 'source.email', label: 'Email' },
 *   ]
 * };
 *
 * const fieldComponents = {
 *   text: MyTextInput,
 *   email: MyEmailInput,
 *   boolean: MyCheckbox,
 *   phone: MyPhoneInput,
 *   date: MyDatePicker,
 * };
 *
 * <DynamicForm
 *   config={config}
 *   fieldComponents={fieldComponents}
 *   onSubmit={(data) => console.log('Submitted:', data)}
 *   onChange={(data, field) => console.log(`${field} changed:`, data)}
 * >
 *   <button type="submit">Submit</button>
 * </DynamicForm>
 * ```
 */
export const DynamicForm = ({
  config,
  initialData,
  fieldComponents,
  customComponents = {},
  customContainers = {},
  onSubmit,
  onChange,
  onValidationChange,
  onReset,
  onError,
  resolver: externalResolver,
  schema: externalSchema,
  mode = "onChange",
  invisibleFieldValidation = "skip",
  className,
  style,
  id,
  children,
  fieldWrapper,
  ref,
}: DynamicFormPropsWithRef): React.ReactElement => {
  // Step 1: Parse and validate configuration
  // This throws if the configuration is invalid
  const parsedConfig = useMemo(() => {
    return parseConfiguration(config);
  }, [config]);

  // Step 2: Generate Zod schema from configuration (only if no external validation provided)
  // This is lazy - only generated when needed for internal validation
  const internalZodSchema = useMemo(() => {
    // Skip internal schema generation if external resolver or schema provided
    if (externalResolver || externalSchema) {
      return null;
    }
    return generateZodSchema(parsedConfig);
  }, [parsedConfig, externalResolver, externalSchema]);

  // Step 3: Calculate default values
  // Merges config defaults with initialData
  const defaultValues = useMemo(() => {
    return mergeDefaults(parsedConfig, initialData);
  }, [parsedConfig, initialData]);

  // Step 4: Initialize visibility state based on default values
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    return calculateVisibility(
      parsedConfig.elements,
      defaultValues as Record<string, unknown>
    );
  });

  // Keep visibility in a ref for stable closure access in the resolver.
  // This prevents stale closure issues since react-hook-form caches the resolver.
  // Updating refs during render is safe and ensures the latest value is available.
  const visibilityRef = useRef(visibility);
  visibilityRef.current = visibility;

  // Re-initialize visibility when config changes
  useEffect(() => {
    setVisibility(
      calculateVisibility(
        parsedConfig.elements,
        defaultValues as Record<string, unknown>
      )
    );
  }, [parsedConfig, defaultValues]);

  // Step 5: Create resolver with priority: external resolver > external schema > internal schema
  // - If externalResolver provided: use it directly (full control to consumer)
  // - If externalSchema provided: wrap with visibility-aware resolver
  // - If internalZodSchema available: wrap with visibility-aware resolver
  // - Otherwise: no validation (undefined resolver)
  const resolver = useMemo(() => {
    // Priority 1: External resolver - use as-is (consumer has full control)
    if (externalResolver) {
      return externalResolver;
    }

    // Priority 2: External Zod schema - wrap with visibility-aware resolver
    if (externalSchema) {
      return createVisibilityAwareResolver({
        schema: externalSchema,
        getVisibility: () => visibilityRef.current,
        invisibleFieldValidation,
      });
    }

    // Priority 3: Internal schema from config - wrap with visibility-aware resolver
    if (internalZodSchema) {
      return createVisibilityAwareResolver({
        schema: internalZodSchema,
        getVisibility: () => visibilityRef.current,
        invisibleFieldValidation,
      });
    }

    // No validation - return undefined
    return undefined;
  }, [
    externalResolver,
    externalSchema,
    internalZodSchema,
    invisibleFieldValidation,
  ]);

  // Step 6: Initialize react-hook-form with visibility-aware resolver
  const form = useForm<FormData>({
    defaultValues,
    resolver,
    mode,
  });

  // Step 7: Expose form methods via ref
  useImperativeHandle(
    ref,
    () => ({
      getValues: () => form.getValues(),
      setValue: (name: string, value: unknown) => form.setValue(name, value),
      watch: (name?: string) => (name ? form.watch(name) : form.watch()),
      reset: (values?: FormData) => form.reset(values ?? defaultValues),
      trigger: (name?: string) => form.trigger(name),
    }),
    [form, defaultValues]
  );

  // Step 8: Build dependency map for cascading field resets
  const dependencyMap = useMemo(
    () => buildDependencyMap(parsedConfig.elements),
    [parsedConfig]
  );

  // Track previous values for dependency change detection
  const previousValuesRef = useRef<Record<string, unknown>>({});

  // Step 9: Subscribe to value changes and recalculate visibility
  useEffect(() => {
    const subscription = form.watch((values) => {
      const newVisibility = calculateVisibility(
        parsedConfig.elements,
        values as Record<string, unknown>
      );
      setVisibility(newVisibility);
    });
    return () => subscription.unsubscribe();
  }, [form, parsedConfig]);

  // Step 10: Handle field dependencies - reset dependent fields when parent changes
  useEffect(() => {
    if (Object.keys(dependencyMap).length === 0) {
      return;
    }

    const subscription = form.watch((values, { name }) => {
      if (!(name && dependencyMap[name])) {
        return;
      }

      const formValues = values as Record<string, unknown>;
      const currentValue = formValues[name];
      const previousValue = previousValuesRef.current[name];

      if (currentValue === previousValue) {
        return;
      }

      previousValuesRef.current[name] = currentValue;

      for (const dependentName of dependencyMap[name]) {
        const field = findFieldByName(parsedConfig.elements, dependentName);
        if (field && field.resetOnParentChange !== false) {
          form.setValue(dependentName, getFieldDefault(field));
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, dependencyMap, parsedConfig]);

  // Step 11: Subscribe to value changes for onChange callback
  useEffect(() => {
    if (!onChange) {
      return;
    }

    const subscription = form.watch((values, { name }) => {
      if (name) {
        onChange(values as FormData, name);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, onChange]);

  // Step 12: Subscribe to validation state changes
  useEffect(() => {
    if (!onValidationChange) {
      return;
    }

    const subscription = form.watch(() => {
      const { errors, isValid } = form.formState;
      onValidationChange(errors, isValid);
    });

    return () => subscription.unsubscribe();
  }, [form, onValidationChange]);

  // Step 13: Create context value
  const contextValue: DynamicFormContextValue = useMemo(
    () => ({
      form,
      config: parsedConfig,
      fieldComponents,
      customComponents,
      customContainers,
      visibility,
      fieldWrapper,
    }),
    [
      form,
      parsedConfig,
      fieldComponents,
      customComponents,
      customContainers,
      visibility,
      fieldWrapper,
    ]
  );

  // Step 11: Handle form submission
  const handleSubmit = form.handleSubmit(
    // Success handler
    async (data) => {
      await onSubmit(data);
    },
    // Error handler
    (errors) => {
      onError?.(errors);
    }
  );

  // Step 12: Handle form reset
  const handleReset = () => {
    form.reset(defaultValues);
    onReset?.();
  };

  return (
    <FormProvider {...form}>
      <DynamicFormContext.Provider value={contextValue}>
        <form
          className={className}
          id={id}
          noValidate
          onReset={handleReset}
          onSubmit={handleSubmit}
          style={style} // Let react-hook-form handle validation
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
