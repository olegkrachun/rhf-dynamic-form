import { useMemo } from "react";
import { useController, useFormState } from "react-hook-form";
import { useDynamicFormContext } from "../hooks";
import type { FieldElement } from "../types";
import { getValidationDependents } from "../utils";
import { FieldPresentation } from "./FieldPresentation";

export interface FieldRendererProps {
  config: FieldElement;
}

interface FieldStatePresentationProps {
  config: FieldElement;
  field: ReturnType<typeof useController>["field"];
}

/**
 * Keeps error/dirty subscriptions below FieldRenderer. Reading the
 * Controller fieldState proxy in consumer components would otherwise attach
 * those subscriptions to FieldRenderer and wake unrelated fields whenever
 * RHF publishes a new errors/dirtyFields object.
 */
const FieldStatePresentation = ({
  config,
  field,
}: FieldStatePresentationProps) => {
  const { components, fieldWrapper, form } = useDynamicFormContext();
  const formState = useFormState({
    control: form.control,
    name: config.name,
    exact: true,
  });
  const currentFieldState = form.getFieldState(config.name, formState);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keep a stable object until one of its observable scalar members changes
  const fieldState = useMemo(
    () => currentFieldState,
    [
      currentFieldState.error,
      currentFieldState.invalid,
      currentFieldState.isDirty,
      currentFieldState.isTouched,
      currentFieldState.isValidating,
    ]
  );

  return (
    <FieldPresentation
      components={components}
      config={config}
      control={form.control}
      field={field}
      fieldState={fieldState}
      fieldWrapper={fieldWrapper}
      getFieldState={form.getFieldState}
      getValues={form.getValues}
      setValue={form.setValue}
    />
  );
};

export const FieldRenderer: React.FC<FieldRendererProps> = ({ config }) => {
  const { config: formConfig, form, visibility } = useDynamicFormContext();
  const dependents = useMemo(
    () => getValidationDependents(formConfig, config.name),
    [formConfig, config.name]
  );
  const validationDeps = dependents?.length === 1 ? dependents[0] : dependents;
  const { field } = useController({
    name: config.name,
    control: form.control,
    rules: validationDeps ? { deps: validationDeps } : undefined,
  });

  if (visibility[config.name] === false) {
    return null;
  }

  return <FieldStatePresentation config={config} field={field} />;
};

FieldRenderer.displayName = "FieldRenderer";
