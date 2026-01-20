import { useController } from "react-hook-form";
import type { StandardFieldComponentType } from "@/types/fields";
import { useDynamicFormContext } from "../hooks";
import type {
  BaseFieldComponent,
  CustomFieldComponent,
  FieldElement,
  FormData,
} from "../types";
import { isCustomFieldElement } from "../types";

/**
 * Props for the FieldRenderer component.
 */
export interface FieldRendererProps {
  /** Field element configuration */
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
  const { customComponents } = useDynamicFormContext();

  if (config.type !== "custom") {
    return null;
  }

  const FieldComponent = customComponents[
    config.component
  ] as CustomFieldComponent;

  if (!FieldComponent) {
    console.warn(
      `No custom component registered for: "${config.component}". ` +
        "Make sure to pass it in the customComponents prop."
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

const StandardFieldRenderer = ({
  config,
  field,
  fieldState,
  formValues,
  setValue,
}: InternalFieldRendererProps) => {
  const { fieldComponents } = useDynamicFormContext();
  const FieldComponent = fieldComponents[
    config.type as StandardFieldComponentType
  ] as BaseFieldComponent;

  if (!FieldComponent) {
    console.warn(
      `No field component registered for type: "${config.type}". ` +
        "Make sure to provide all field types in the fieldComponents prop."
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

/**
 * Renders a single field using the registered field component.
 *
 * This component:
 * 1. Gets the react-hook-form controller for the field
 * 2. Resolves the appropriate field component from the registry
 * 3. Passes the controller props (field, fieldState, formValues, setValue) to the component
 *
 * @example
 * ```tsx
 * // Used internally by ElementRenderer
 * <FieldRenderer config={{ type: 'text', name: 'source.name', label: 'Name' }} />
 * ```
 */
export const FieldRenderer: React.FC<FieldRendererProps> = ({ config }) => {
  const { form, visibility, fieldComponents, fieldWrapper } =
    useDynamicFormContext();

  // Get controller from react-hook-form (must be called before any early returns)
  const { field, fieldState } = useController({
    name: config.name,
    control: form.control,
  });

  // Check visibility (Phase 4 - for now all fields are visible)
  const isVisible = visibility[config.name] !== false;
  if (!isVisible) {
    return null;
  }

  // Get form values and setValue function for field components
  const formValues = form.getValues();
  const setValue = (name: string, value: unknown) => form.setValue(name, value);

  // Determine the field element to render
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
    const FieldComponent = fieldComponents[config.type];

    if (!FieldComponent) {
      console.warn(
        `No field component registered for type: "${config.type}". ` +
          "Make sure to provide all field types in the fieldComponents prop."
      );
      return null;
    }

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

  // If fieldWrapper provided, wrap the field
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
