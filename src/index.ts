// =============================================================================
// Dynamic Form Library - Main Exports
// =============================================================================

export type { DynamicFormContextValue } from "./context";
// =============================================================================
// Context (for advanced use cases)
// =============================================================================
export { DynamicFormContext } from "./context";
// Main Component
export { DynamicForm, default } from "./DynamicForm";
// =============================================================================
// Hooks
// =============================================================================
export {
  useDynamicFormContext,
  useDynamicFormContextSafe,
} from "./hooks";
export type { ParseResult } from "./parser";
// =============================================================================
// Parser (for advanced use cases)
// =============================================================================
export {
  ConfigurationError,
  parseConfiguration,
  safeParseConfiguration,
} from "./parser";
// =============================================================================
// Resolver (Phase 3 - Visibility-aware validation)
// =============================================================================
export {
  createVisibilityAwareResolver,
  type VisibilityAwareResolverOptions,
} from "./resolver";
export type { GeneratedSchema, InferSchemaType } from "./schema";
// =============================================================================
// Schema Generation (for advanced use cases)
// =============================================================================
export {
  buildFieldSchema,
  generateZodSchema,
  getSchemaFieldPaths,
} from "./schema";
// =============================================================================
// Types - Configuration
// =============================================================================
// =============================================================================
// Types - Elements
// =============================================================================
// =============================================================================
// Types - Field Components (for implementing field components)
// =============================================================================
// =============================================================================
// Types - Validation
// =============================================================================
// =============================================================================
// Types - Events
// =============================================================================
export type {
  ApiOptionsSource,
  ArrayFieldComponent,
  ArrayFieldElement,
  ArrayFieldProps,
  BaseFieldProps,
  BooleanFieldComponent,
  BooleanFieldElement,
  BooleanFieldProps,
  ColumnComponent,
  ColumnElement,
  ColumnProps,
  ContainerComponent,
  ContainerElement,
  ContainerProps,
  CustomComponentDefinition,
  CustomComponentRegistry,
  CustomContainerRegistry,
  CustomFieldComponent,
  CustomFieldElement,
  CustomFieldProps,
  DateFieldComponent,
  DateFieldElement,
  DateFieldProps,
  DynamicFormProps,
  DynamicFormRef,
  ElementType,
  EmailFieldComponent,
  EmailFieldElement,
  EmailFieldProps,
  FieldComponentRegistry,
  FieldElement,
  FieldProps,
  FieldType,
  FieldWrapperFunction,
  FieldWrapperProps,
  FormConfiguration,
  FormData,
  FormElement,
  InvisibleFieldValidation,
  JsonLogicRule,
  LayoutElement,
  MapOptionsSource,
  OnChangeHandler,
  OnErrorHandler,
  OnResetHandler,
  OnSubmitHandler,
  OnValidationChangeHandler,
  OptionsSource,
  PhoneFieldComponent,
  PhoneFieldElement,
  PhoneFieldProps,
  ResolverOptionsSource,
  SearchOptionsSource,
  SelectFieldComponent,
  SelectFieldElement,
  SelectFieldProps,
  SelectOption,
  StaticOptionsSource,
  TextFieldComponent,
  TextFieldElement,
  TextFieldProps,
  ValidationConfig,
  ZodSchema,
} from "./types";
// Element type guards
export {
  isArrayFieldElement,
  isColumnElement,
  isContainerElement,
  isCustomFieldElement,
  isFieldElement,
} from "./types";
// =============================================================================
// Utilities (for advanced use cases)
// =============================================================================
export {
  calculateVisibility,
  flattenFields,
  getFieldNames,
  getNestedValue,
  mergeDefaults,
  setNestedValue,
  type VisibilityState,
} from "./utils";
// =============================================================================
// Validation Utilities (Phase 3 - JSON Logic)
// =============================================================================
export { applyJsonLogic, evaluateCondition } from "./validation";
