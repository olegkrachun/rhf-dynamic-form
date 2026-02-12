import type {
  ControllerFieldState,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import type { CustomComponentRegistry } from "@/customComponents";
import type {
  ArrayFieldElement,
  BaseFieldElement,
  ContainerElement,
  CustomFieldElement,
  SelectFieldElement,
} from "./elements";
import type { FormData } from "./events";

/**
 * Base props passed to all field components.
 * Field components receive react-hook-form controller props.
 *
 * @example
 * ```tsx
 * const MyTextField: BaseFieldComponent = ({ field, fieldState, config, formValues }) => (
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

// ============================================================================
// Structurally-specific field props
// Only types that add properties beyond BaseFieldElement get their own Props.
// ============================================================================

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

// ============================================================================
// Component types
// ============================================================================

/**
 * Base component type that accepts any field configuration.
 * Used internally for dynamic field rendering where the specific
 * field type is determined at runtime.
 */
export type BaseFieldComponent<TProps extends BaseFieldProps = BaseFieldProps> =
  React.ComponentType<TProps>;

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

/**
 * Open-ended field component registry.
 *
 * Consumers provide components for every field type they use.
 * The engine does NOT enforce a fixed set — any string key is valid.
 *
 * @example
 * ```tsx
 * const fields: FieldComponentRegistry = {
 *   text: MyTextField,
 *   email: MyEmailField,
 *   boolean: MyCheckbox,
 *   phone: MyPhoneField,
 *   date: MyDatePicker,
 *   select: MyDropdown,
 *   array: MyRepeater,
 *   // Consumer-defined types — engine renders them the same way:
 *   textarea: MyTextarea,
 *   currency: MyCurrencyField,
 * };
 * ```
 */
export type FieldComponentRegistry = Record<string, BaseFieldComponent>;

// Note: CustomComponentRegistry is exported from customComponents module
// for full definition support with propsSchema validation

/**
 * Field props type.
 * Uses BaseFieldProps so the engine stays type-agnostic.
 */
export type FieldProps = BaseFieldProps;

// ============================================================================
// Container Component Types (Phase 2)
// ============================================================================

/**
 * Props for container components.
 * Container receives its config (with meta) and rendered children.
 */
export interface ContainerProps {
  /** Container configuration from form config (variant, meta, visible, etc.) */
  config: ContainerElement;
  /** Rendered child elements */
  children: React.ReactNode;
}

/**
 * Component type for container layouts.
 */
export type ContainerComponent = React.ComponentType<ContainerProps>;

/**
 * Registry for container components referenced by variant name.
 *
 * @example
 * ```tsx
 * const containers: CustomContainerRegistry = {
 *   row: RowContainer,
 *   column: ColumnContainer,
 *   section: SectionContainer,
 * };
 * ```
 */
export type CustomContainerRegistry = Record<string, ContainerComponent>;

// ============================================================================
// Unified Component Registry
// ============================================================================

/**
 * Single registry for all consumer-provided components.
 * This is the only entry point for providing visual implementations to the engine.
 *
 * The engine looks at config elements and goes to the registry:
 * - `{ type: "text" }`                            → `components.fields.text`
 * - `{ type: "custom", component: "currency" }`   → `components.custom.currency`
 * - `{ type: "container", variant: "section" }`    → `components.containers.section`
 * - `{ type: "container", variant: "column" }`     → `components.containers.column`
 * - `{ type: "container" }`                        → `components.containers.default` ?? bare Fragment
 *
 * @example
 * ```tsx
 * const components: ComponentRegistry = {
 *   fields: {
 *     text: MyTextField,
 *     email: MyEmailField,
 *     boolean: MyCheckbox,
 *     phone: MyPhoneField,
 *     date: MyDatePicker,
 *     select: MyDropdown,
 *     array: MyRepeater,
 *   },
 *   custom: {
 *     currency: MyCurrencyField,
 *   },
 *   containers: {
 *     row: MyRowContainer,
 *     column: MyColumnContainer,
 *     section: MySectionContainer,
 *   },
 * };
 * ```
 */
export interface ComponentRegistry {
  /** Required: implementations for each standard field type */
  fields: FieldComponentRegistry;

  /** Optional: custom field components (type: "custom", component: "name") */
  custom?: CustomComponentRegistry;

  /** Optional: container components looked up by variant name */
  containers?: CustomContainerRegistry;
}
