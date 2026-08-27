import { memo } from "react";
import type {
  Control,
  ControllerFieldState,
  UseFormReturn,
  useController,
} from "react-hook-form";
import {
  type CustomComponentRenderProps,
  normalizeComponentDefinition,
} from "../customComponents";
import type {
  BaseFieldComponent,
  ComponentRegistry,
  CustomFieldElement,
  FallbackComponent,
  FieldElement,
  FieldWrapperFunction,
  FormData,
  MissingComponentInfo,
} from "../types";
import { isCustomFieldElement } from "../types";
import { resolveFallbackComponent } from "../utils";

type ControllerField = ReturnType<typeof useController>["field"];

interface RenderFieldProps {
  components: ComponentRegistry;
  config: FieldElement;
  field: ControllerField;
  fieldState: ControllerFieldState;
  formValues: FormData;
  setValue: (name: string, value: unknown) => void;
}

interface MissingComponentFallbackProps extends RenderFieldProps {
  FallbackComponent: FallbackComponent;
  missingComponent: MissingComponentInfo;
  componentProps?: Record<string, unknown>;
}

const MissingComponentFallback = ({
  FallbackComponent,
  componentProps,
  config,
  field,
  fieldState,
  formValues,
  missingComponent,
  setValue,
}: MissingComponentFallbackProps) => (
  <FallbackComponent
    componentProps={componentProps}
    config={config}
    field={field}
    fieldState={fieldState}
    formValues={formValues}
    missingComponent={missingComponent}
    setValue={setValue}
  />
);

const CustomField = (props: RenderFieldProps) => {
  const { components, config, field, fieldState, formValues, setValue } = props;
  const customConfig = config as CustomFieldElement;
  const entry = components.custom?.[customConfig.component];

  if (!entry) {
    const FallbackComponent = resolveFallbackComponent(
      components.fallback,
      "custom"
    );
    if (!FallbackComponent) {
      console.warn(
        `No custom component registered for: "${customConfig.component}". ` +
          "Make sure to pass it in components.custom."
      );
      return null;
    }
    return (
      <MissingComponentFallback
        {...props}
        componentProps={customConfig.componentProps}
        FallbackComponent={FallbackComponent}
        missingComponent={{
          kind: "custom",
          requested: customConfig.component,
        }}
      />
    );
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

const StandardField = (props: RenderFieldProps) => {
  const { components, config, field, fieldState, formValues, setValue } = props;
  const FieldComponent = components.fields[config.type] as BaseFieldComponent;

  if (!FieldComponent) {
    const FallbackComponent = resolveFallbackComponent(
      components.fallback,
      "field"
    );
    if (!FallbackComponent) {
      console.warn(
        `No field component registered for type: "${config.type}". ` +
          "Make sure to provide all field types in components.fields."
      );
      return null;
    }
    return (
      <MissingComponentFallback
        {...props}
        FallbackComponent={FallbackComponent}
        missingComponent={{ kind: "field", requested: config.type }}
      />
    );
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

export interface FieldPresentationProps {
  components: ComponentRegistry;
  control: Control<FormData>;
  config: FieldElement;
  field: ControllerField;
  fieldState: ControllerFieldState;
  fieldWrapper?: FieldWrapperFunction;
  getFieldState: UseFormReturn<FormData>["getFieldState"];
  getValues: () => FormData;
  setValue: (name: string, value: unknown) => void;
}

const FieldPresentationComponent = ({
  components,
  control,
  config,
  field,
  fieldState,
  fieldWrapper,
  getFieldState,
  getValues,
  setValue,
}: FieldPresentationProps) => {
  const formValues = getValues();
  const renderProps = {
    components,
    config,
    field,
    fieldState,
    formValues,
    setValue,
  };
  const fieldElement = isCustomFieldElement(config) ? (
    <CustomField {...renderProps} />
  ) : (
    <StandardField {...renderProps} />
  );

  if (!fieldWrapper) {
    return fieldElement;
  }
  return fieldWrapper(
    {
      control,
      name: config.name,
      config,
      fieldState,
      getFieldState,
      getValues,
      value: field.value,
      formValues,
      setValue,
    },
    fieldElement
  );
};

export const FieldPresentation = memo(FieldPresentationComponent);
FieldPresentation.displayName = "FieldPresentation";
