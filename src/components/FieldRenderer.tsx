import { useMemo } from "react";
import { useController } from "react-hook-form";
import { useDynamicFormContext } from "../hooks";
import type { FieldElement } from "../types";
import { getValidationDependents } from "../utils";
import { FieldPresentation } from "./FieldPresentation";

export interface FieldRendererProps {
  config: FieldElement;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({ config }) => {
  const {
    components,
    config: formConfig,
    fieldWrapper,
    form,
    visibility,
  } = useDynamicFormContext();
  const dependents = useMemo(
    () => getValidationDependents(formConfig, config.name),
    [formConfig, config.name]
  );
  const validationDeps = dependents?.length === 1 ? dependents[0] : dependents;
  const { field, fieldState } = useController({
    name: config.name,
    control: form.control,
    rules: validationDeps ? { deps: validationDeps } : undefined,
  });

  if (visibility[config.name] === false) {
    return null;
  }

  return (
    <FieldPresentation
      components={components}
      config={config}
      field={field}
      fieldState={fieldState}
      fieldWrapper={fieldWrapper}
      getValues={form.getValues}
      setValue={form.setValue}
    />
  );
};

FieldRenderer.displayName = "FieldRenderer";
