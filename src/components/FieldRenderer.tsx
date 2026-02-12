import { useController } from "react-hook-form";
import {
  type CustomComponentRenderProps,
  normalizeComponentDefinition,
} from "../customComponents";
import { useDynamicFormContext } from "../hooks";
import type {
  BaseFieldComponent,
  CustomFieldElement,
  FieldElement,
  FormData,
} from "../types";
import { isCustomFieldElement } from "../types";

export interface FieldRendererProps {
  config: FieldElement;
}

interface InternalFieldRendererProps {
  config: FieldElement;
  field: ReturnType<typeof useController>["field"];
  fieldState: ReturnType<typeof useController>["fieldState"];
  formValues: FormData;
  setValue: (name: string, value: unknown) => void;
}

const CustomFieldRenderer = ({
  config,
  field,
  fieldState,
  formValues,
  setValue,
}: InternalFieldRendererProps) => {
  const { components } = useDynamicFormContext();
  const customComponents = components.custom ?? {};

  if (config.type !== "custom") {
    return null;
  }

  const customConfig = config as CustomFieldElement;
  const entry = customComponents[customConfig.component];

  if (!entry) {
    console.warn(
      `No custom component registered for: "${customConfig.component}". ` +
        "Make sure to pass it in components.custom."
    );
    return null;
  }

  const definition = normalizeComponentDefinition(
    entry,
    customConfig.component
  );
  const FieldComponent = definition.component as React.ComponentType<
    CustomComponentRenderProps<Record<string, unknown>>
  >;

  return (
    <FieldComponent
      componentProps={customConfig.componentProps ?? {}}
      config={customConfig}
      field={field}
      fieldState={fieldState}
      formValues={formValues}
      setValue={setValue}
    />
  );
};

const StandardFieldRenderer = ({
  config,
  field,
  fieldState,
  formValues,
  setValue,
}: InternalFieldRendererProps) => {
  const { components } = useDynamicFormContext();
  const FieldComponent = components.fields[config.type] as BaseFieldComponent;

  if (!FieldComponent) {
    console.warn(
      `No field component registered for type: "${config.type}". ` +
        "Make sure to provide all field types in components.fields."
    );
    return null;
  }

  return (
    <FieldComponent
      config={config}
      field={field}
      fieldState={fieldState}
      formValues={formValues}
      setValue={setValue}
    />
  );
};

export const FieldRenderer: React.FC<FieldRendererProps> = ({ config }) => {
  const { form, visibility, fieldWrapper } = useDynamicFormContext();

  const { field, fieldState } = useController({
    name: config.name,
    control: form.control,
  });

  const isVisible = visibility[config.name] !== false;
  if (!isVisible) {
    return null;
  }

  const formValues = form.getValues();
  const setValue = (name: string, value: unknown) => form.setValue(name, value);

  let fieldElement: React.ReactNode;

  if (isCustomFieldElement(config)) {
    fieldElement = (
      <CustomFieldRenderer
        config={config}
        field={field}
        fieldState={fieldState}
        formValues={formValues}
        setValue={setValue}
      />
    );
  } else {
    fieldElement = (
      <StandardFieldRenderer
        config={config}
        field={field}
        fieldState={fieldState}
        formValues={formValues}
        setValue={setValue}
      />
    );
  }

  if (fieldWrapper) {
    return fieldWrapper(
      {
        name: config.name,
        config,
        fieldState,
        value: field.value,
        formValues,
        setValue,
      },
      fieldElement
    );
  }

  return fieldElement;
};

FieldRenderer.displayName = "FieldRenderer";
