import type { JsonLogicRule, ValidationConfig } from "./validation";

/**
 * All supported element types in the form configuration.
 * Phase 1: text, email, boolean, phone, date, custom
 * Phase 2 adds: container, column
 * Phase 3 adds: select, array
 */
export type ElementType =
  | "text"
  | "email"
  | "boolean"
  | "phone"
  | "date"
  | "select"
  | "array"
  | "container"
  | "column"
  | "custom";

/**
 * Field types that render input controls.
 */
export type FieldType =
  | "text"
  | "email"
  | "boolean"
  | "phone"
  | "date"
  | "select"
  | "array";

/**
 * Base interface for all field elements.
 */
export interface BaseFieldElement {
  type: ElementType;
  /** Unique identifier for form data binding (supports dot notation like 'source.name') */
  name: string;

  /** Display label for the field */
  label?: string;

  /** Placeholder text (for text-based inputs) */
  placeholder?: string;

  /** Default value for the field (arrays for multi-select, records for complex fields) */
  defaultValue?:
    | string
    | number
    | boolean
    | null
    | unknown[]
    | Record<string, unknown>;

  /** Validation configuration */
  validation?: ValidationConfig;

  /** Conditional visibility rules using JSON Logic (Phase 4) */
  visible?: JsonLogicRule;

  /** Field path this field depends on (for cascading selects, etc.) */
  dependsOn?: string;

  /** Reset this field when parent changes (default: true) */
  resetOnParentChange?: boolean;
}

/**
 * Text input field element.
 */
export interface TextFieldElement extends BaseFieldElement {
  type: "text";
}

/**
 * Email input field element.
 */
export interface EmailFieldElement extends BaseFieldElement {
  type: "email";
}

/**
 * Boolean (checkbox/toggle) field element.
 */
export interface BooleanFieldElement extends BaseFieldElement {
  type: "boolean";
}

/**
 * Phone number input field element.
 */
export interface PhoneFieldElement extends BaseFieldElement {
  type: "phone";
}

/**
 * Date picker field element.
 */
export interface DateFieldElement extends BaseFieldElement {
  type: "date";
}

/**
 * Option for select field elements.
 */
export interface SelectOption {
  /** Option value (stored in form data) */
  value: string | number;

  /** Display label */
  label: string;

  /** Disable this option */
  disabled?: boolean;
}

/**
 * Static options source - use config.options directly.
 */
export interface StaticOptionsSource {
  type: "static";
}

/**
 * Map options source - lookup from provided options map.
 */
export interface MapOptionsSource {
  type: "map";
  /** Key in the options map */
  key: string;
}

/**
 * API options source - fetch from endpoint.
 */
export interface ApiOptionsSource {
  type: "api";
  /** API endpoint URL */
  endpoint: string;
}

/**
 * Search options source - search as you type.
 */
export interface SearchOptionsSource {
  type: "search";
  /** API endpoint for search */
  endpoint: string;
  /** Minimum characters before searching (default: 2) */
  minChars?: number;
}

/**
 * Resolver options source - custom resolver function.
 */
export interface ResolverOptionsSource {
  type: "resolver";
  /** Name of the registered resolver */
  name: string;
}

/**
 * Describes how to resolve options for a select field.
 * This is declarative - describes intent, not implementation.
 * Actual data fetching is done by field component.
 */
export type OptionsSource =
  | StaticOptionsSource
  | MapOptionsSource
  | ApiOptionsSource
  | SearchOptionsSource
  | ResolverOptionsSource;

/**
 * Select field element for dropdowns and multi-selects.
 */
export interface SelectFieldElement extends BaseFieldElement {
  type: "select";

  /** Available options (required when optionsSource is not provided) */
  options?: SelectOption[];

  /** Describes how to resolve options (when provided, options become optional) */
  optionsSource?: OptionsSource;

  /** Allow selecting multiple values (default: false) */
  multiple?: boolean;

  /** Allow clearing selection (default: true) */
  clearable?: boolean;

  /** Allow searching/filtering options (default: false) */
  searchable?: boolean;

  /** Allow creating new options not in the list (default: false) */
  creatable?: boolean;
}

/**
 * Custom component field element.
 * Allows rendering user-defined components.
 */
export interface CustomFieldElement extends BaseFieldElement {
  type: "custom";

  /** Name of the registered custom component */
  component: string;

  /** Props to pass to the custom component */
  componentProps?: Record<string, unknown>;
}

/**
 * Array/repeater field element.
 * Contains repeatable group of fields.
 */
export interface ArrayFieldElement extends BaseFieldElement {
  type: "array";

  /** Fields template for each item (can contain any field type) */
  itemFields: FieldElement[];

  /** Minimum items required */
  minItems?: number;

  /** Maximum items allowed */
  maxItems?: number;

  /** Label for add button */
  addButtonLabel?: string;

  /** Allow reordering items */
  sortable?: boolean;
}

/**
 * Container element for grouping fields in columns (Phase 2).
 */
export interface ContainerElement {
  type: "container";

  /** Array of column elements */
  columns: ColumnElement[];

  /** Conditional visibility rules using JSON Logic */
  visible?: JsonLogicRule;
}

/**
 * Column element within a container (Phase 2).
 */
export interface ColumnElement {
  type: "column";

  /** Column width (e.g., '50%', '200px') */
  width: string;

  /** Nested elements within the column */
  elements: FormElement[];

  /** Conditional visibility rules using JSON Logic */
  visible?: JsonLogicRule;
}

/**
 * Union of all field element types.
 */
export type FieldElement =
  | TextFieldElement
  | EmailFieldElement
  | BooleanFieldElement
  | PhoneFieldElement
  | DateFieldElement
  | SelectFieldElement
  | ArrayFieldElement
  | CustomFieldElement;

/**
 * Union of all layout element types.
 */
export type LayoutElement = ContainerElement | ColumnElement;

/**
 * Union of all form element types.
 */
export type FormElement = FieldElement | LayoutElement;

/**
 * Type guard to check if an element is a field element.
 */
export const isFieldElement = (element: FormElement): element is FieldElement =>
  element.type === "text" ||
  element.type === "email" ||
  element.type === "boolean" ||
  element.type === "phone" ||
  element.type === "date" ||
  element.type === "select" ||
  element.type === "array" ||
  element.type === "custom";

/**
 * Type guard to check if an element is an array field element.
 */
export const isArrayFieldElement = (
  element: FormElement
): element is ArrayFieldElement => element.type === "array";

/**
 * Type guard to check if an element is a container element.
 */
export const isContainerElement = (
  element: FormElement
): element is ContainerElement => element.type === "container";

/**
 * Type guard to check if an element is a column element.
 */
export const isColumnElement = (
  element: FormElement
): element is ColumnElement => element.type === "column";

/**
 * Type guard to check if an element is a custom field element.
 */
export const isCustomFieldElement = (
  element: FormElement
): element is CustomFieldElement => element.type === "custom";
