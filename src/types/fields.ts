import type {
  ControllerFieldState,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import type {
  ArrayFieldElement,
  BaseFieldElement,
  BooleanFieldElement,
  ColumnElement,
  ContainerElement,
  CustomFieldElement,
  DateFieldElement,
  ElementType,
  EmailFieldElement,
  PhoneFieldElement,
  SelectFieldElement,
  TextFieldElement,
} from "./elements";
import type { FormData } from "./events";

/**
 * Base props passed to all field components.
 * Field components receive react-hook-form controller props.
 *
 * @example
 * ```tsx
 * const MyTextField: TextFieldComponent = ({ field, fieldState, config, formValues }) => (
 *   <div>
 *     <label>{config.label}</label>
 *     <input {...field} />
 *     {fieldState.error && <span>{fieldState.error.message}</span>}
 *   </div>
 * );
 * ```
 */
export interface BaseFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TConfig extends BaseFieldElement = BaseFieldElement,
> {
  /** react-hook-form field props (value, onChange, onBlur, name, ref) */
  field: ControllerRenderProps<TFieldValues, TName>;

  /** react-hook-form field state (invalid, isTouched, isDirty, error) */
  fieldState: ControllerFieldState;

  /** Field configuration from form config */
  config: TConfig;

  /** All current form values (for reading other fields, dependent logic) */
  formValues: FormData;

  /** Set any field value (for dependent field logic, cascading updates) */
  setValue: (name: string, value: unknown) => void;
}

/**
 * Props for text input field component.
 */
export type TextFieldProps = BaseFieldProps<
  FieldValues,
  FieldPath<FieldValues>,
  TextFieldElement
>;

/**
 * Props for email input field component.
 */
export type EmailFieldProps = BaseFieldProps<
  FieldValues,
  FieldPath<FieldValues>,
  EmailFieldElement
>;

/**
 * Props for boolean (checkbox/toggle) field component.
 */
export type BooleanFieldProps = BaseFieldProps<
  FieldValues,
  FieldPath<FieldValues>,
  BooleanFieldElement
>;

/**
 * Props for phone input field component.
 */
export type PhoneFieldProps = BaseFieldProps<
  FieldValues,
  FieldPath<FieldValues>,
  PhoneFieldElement
>;

/**
 * Props for date input field component.
 */
export type DateFieldProps = BaseFieldProps<
  FieldValues,
  FieldPath<FieldValues>,
  DateFieldElement
>;

/**
 * Props for select field component.
 */
export type SelectFieldProps = BaseFieldProps<
  FieldValues,
  FieldPath<FieldValues>,
  SelectFieldElement
>;

/**
 * Props for array field component.
 */
export type ArrayFieldProps = BaseFieldProps<
  FieldValues,
  FieldPath<FieldValues>,
  ArrayFieldElement
>;

/**
 * Props for custom field components.
 * Custom components receive additional componentProps from configuration.
 */
export type CustomFieldProps = BaseFieldProps<
  FieldValues,
  FieldPath<FieldValues>,
  CustomFieldElement
>;

/**
 * Base component type that accepts any field configuration.
 * Used internally for dynamic field rendering where the specific
 * field type is determined at runtime.
 */
export type BaseFieldComponent<TProps extends BaseFieldProps = BaseFieldProps> =
  React.ComponentType<TProps>;

/**
 * Component type for text fields.
 */
export type TextFieldComponent = BaseFieldComponent<TextFieldProps>;

/**
 * Component type for email fields.
 */
export type EmailFieldComponent = BaseFieldComponent<EmailFieldProps>;

/**
 * Component type for boolean fields.
 */
export type BooleanFieldComponent = BaseFieldComponent<BooleanFieldProps>;

/**
 * Component type for phone fields.
 */
export type PhoneFieldComponent = BaseFieldComponent<PhoneFieldProps>;

/**
 * Component type for date fields.
 */
export type DateFieldComponent = BaseFieldComponent<DateFieldProps>;

/**
 * Component type for select fields.
 */
export type SelectFieldComponent = BaseFieldComponent<SelectFieldProps>;

/**
 * Component type for array fields.
 */
export type ArrayFieldComponent = BaseFieldComponent<ArrayFieldProps>;

/**
 * Component type for custom fields.
 */
export type CustomFieldComponent = BaseFieldComponent<CustomFieldProps>;

export type StandardFieldComponent =
  | TextFieldComponent
  | EmailFieldComponent
  | BooleanFieldComponent
  | PhoneFieldComponent
  | DateFieldComponent
  | SelectFieldComponent
  | ArrayFieldComponent;

export type StandardFieldComponentType = Exclude<ElementType, "custom">;

export interface FieldComponentRegistry
  extends Partial<Record<StandardFieldComponentType, StandardFieldComponent>> {
  text: TextFieldComponent;
  email: EmailFieldComponent;
  boolean: BooleanFieldComponent;
  phone: PhoneFieldComponent;
  date: DateFieldComponent;
  select: SelectFieldComponent;
  array: ArrayFieldComponent;
}

// Note: CustomComponentRegistry is exported from customComponents module
// for full definition support with propsSchema validation

/**
 * Union type for all field props.
 */
export type FieldProps =
  | TextFieldProps
  | EmailFieldProps
  | BooleanFieldProps
  | PhoneFieldProps
  | DateFieldProps
  | SelectFieldProps
  | ArrayFieldProps
  | CustomFieldProps;

// ============================================================================
// Container Component Types (Phase 2)
// ============================================================================

/**
 * Props for container components.
 * Containers wrap columns and provide layout structure.
 */
export interface ContainerProps {
  /** Container configuration from form config */
  config: ContainerElement;
  /** Column elements rendered as children */
  children: React.ReactNode;
}

/**
 * Props for column components.
 * Columns wrap form elements and apply width styling.
 */
export interface ColumnProps {
  /** Column configuration from form config */
  config: ColumnElement;
  /** Form elements rendered as children */
  children: React.ReactNode;
}

/**
 * Component type for container layouts.
 */
export type ContainerComponent = React.ComponentType<ContainerProps>;

/**
 * Component type for column layouts.
 */
export type ColumnComponent = React.ComponentType<ColumnProps>;

/**
 * Registry for custom container components referenced by name.
 * Allows users to provide custom container implementations.
 *
 * @example
 * ```tsx
 * const customContainers: CustomContainerRegistry = {
 *   card: CardContainer,
 *   section: SectionContainer,
 * };
 * ```
 */
export type CustomContainerRegistry = Record<string, ContainerComponent>;
