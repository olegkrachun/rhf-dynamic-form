import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { FormRenderer } from "./components";
import { DynamicFormContext, type DynamicFormContextValue } from "./context";
import { validateCustomComponents } from "./customComponents";
import { useDynamicFormHandle } from "./hooks/useDynamicFormHandle";
import { useFormStateSnapshot } from "./hooks/useFormStateSnapshot";
import { useFormValueEffects } from "./hooks/useFormValueEffects";
import { parseConfiguration } from "./parser";
import { createVisibilityAwareResolver } from "./resolver";
import { generateZodSchema } from "./schema";
import type {
  ComponentRegistry,
  DynamicFormProps,
  DynamicFormRef,
  FormData,
} from "./types";
import {
  calculateVisibility,
  hasFallbackComponent,
  mergeDefaults,
} from "./utils";

interface DynamicFormPropsWithRef extends DynamicFormProps {
  ref?: React.Ref<DynamicFormRef>;
}

const EMPTY_CUSTOM_COMPONENTS = {};

const registriesEqual = (
  previous: object | undefined,
  next: object | undefined
) => {
  if (previous === next) {
    return true;
  }
  if (!(previous && next)) {
    return false;
  }
  const previousRecord = previous as Record<string, unknown>;
  const nextRecord = next as Record<string, unknown>;
  const keys = Object.keys(previousRecord);
  return (
    keys.length === Object.keys(nextRecord).length &&
    keys.every((key) => previousRecord[key] === nextRecord[key])
  );
};

const useStableComponents = (components: ComponentRegistry) => {
  const stableRef = useRef(components);
  const previous = stableRef.current;
  const unchanged = (
    ["fields", "custom", "containers", "fallback", "resolvers"] as const
  ).every((key) => registriesEqual(previous[key], components[key]));
  if (!unchanged) {
    stableRef.current = components;
  }
  return stableRef.current;
};

export const DynamicForm = ({
  config,
  initialData,
  components,
  onSubmit,
  onChange,
  onValidationChange,
  onDirtyChange,
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
  const stableComponents = useStableComponents(components);
  const customComponents = stableComponents.custom ?? EMPTY_CUSTOM_COMPONENTS;
  const allowMissingCustomComponents = hasFallbackComponent(
    stableComponents.fallback,
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

  const visibilityRef = useRef(visibility);
  visibilityRef.current = visibility;

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
  const { stateRef, validation } = useFormStateSnapshot(
    form,
    validateOnMount,
    onValidationChange,
    onDirtyChange
  );
  useDynamicFormHandle({ defaultValues, form, ref, stateRef });
  useFormValueEffects({
    form,
    config: parsedConfig,
    onChange,
    setVisibility,
  });

  const contextValue: DynamicFormContextValue = useMemo(
    () => ({
      form,
      config: parsedConfig,
      components: stableComponents,
      visibility,
      fieldWrapper,
      validation,
    }),
    [form, parsedConfig, stableComponents, visibility, fieldWrapper, validation]
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
