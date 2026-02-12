import type { JsonLogicRule, ValidationConfig } from "./validation";

/**
 * Element type identifier.
 *
 * The engine only distinguishes two kinds:
 * - `"container"` — layout wrapper, looked up by variant
 * - anything else — a field, looked up by type string in `components.fields`
 *
 * Consumers can use ANY string as a field type (e.g. "textarea", "currency",
 * "rich-text"). The engine does not maintain a closed set of field types.
 *
 * Well-known types (text, email, boolean, phone, date, select, array, custom)
 * are provided as convenience interfaces but are NOT enforced by the engine.
 */
export type ElementType = string;

/**
 * Field type identifier — any string except "container".
 * The engine treats every non-container element as a field.
 */
export type FieldType = string;

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

  /**
   * Consumer-specific metadata.
   * The engine does not interpret this — it passes it through to field components.
   * Use for gridSpan, fieldClassName, confidence, readOnly, etc.
   */
  meta?: Record<string, unknown>;
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
 * Container element — a layout wrapper looked up by `variant` in `ComponentRegistry.containers`.
 *
 * The engine only knows two things: field and container.
 * What the container IS (column, section, row, grid, card) is decided by the consumer
 * via the `variant` key and the component registered for that variant.
 *
 * @example
 * ```json
 * { "type": "container", "variant": "row", "children": [...] }
 * { "type": "container", "variant": "column", "meta": { "width": "50%" }, "children": [...] }
 * { "type": "container", "variant": "section", "meta": { "title": "Details" }, "children": [...] }
 * ```
 */
export interface ContainerElement {
  type: "container";

  /** Variant name — looked up in `ComponentRegistry.containers[variant]` */
  variant?: string;

  /** Child elements rendered by the engine inside this container */
  children?: FormElement[];

  /** Conditional visibility rules using JSON Logic */
  visible?: JsonLogicRule;

  /**
   * Consumer-specific metadata.
   * The engine does not interpret this — it passes it through to container components.
   * Use for width, title, icon, id, collapsible, className, gridSpan, etc.
   */
  meta?: Record<string, unknown>;
}

/**
 * Structurally-specific field element types.
 * These have additional required properties beyond BaseFieldElement.
 */
export type StructuralFieldElement =
  | SelectFieldElement
  | ArrayFieldElement
  | CustomFieldElement;

/**
 * A field element — any element whose type is not "container".
 * The engine accepts ANY type string; structurally-specific types
 * (select, array, custom) add required properties.
 */
export type FieldElement = StructuralFieldElement | BaseFieldElement;

/**
 * Union of all layout element types.
 */
export type LayoutElement = ContainerElement;

/**
 * Union of all form element types (fields and containers).
 */
export type FormElement = FieldElement | LayoutElement;

/**
 * Type guard to check if an element is a field element (any non-container).
 */
export const isFieldElement = (element: FormElement): element is FieldElement =>
  element.type !== "container";

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
 * Type guard to check if an element is a custom field element.
 */
export const isCustomFieldElement = (
  element: FormElement
): element is CustomFieldElement => element.type === "custom";

/**
 * Type guard to check if a container is a section container.
 */
export const isSectionContainer = (
  element: FormElement
): element is ContainerElement =>
  element.type === "container" &&
  (element as ContainerElement).variant === "section";
