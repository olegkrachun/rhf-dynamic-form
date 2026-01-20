// Validation types

// Configuration types
export type {
  CustomComponentDefinition,
  DynamicFormProps,
  DynamicFormRef,
  FieldWrapperFunction,
  FieldWrapperProps,
  FormConfiguration,
  ZodSchema,
} from "./config";

// Element types
export type {
  ApiOptionsSource,
  ArrayFieldElement,
  BooleanFieldElement,
  ColumnElement,
  ContainerElement,
  CustomFieldElement,
  DateFieldElement,
  ElementType,
  EmailFieldElement,
  FieldElement,
  FieldType,
  FormElement,
  LayoutElement,
  MapOptionsSource,
  OptionsSource,
  PhoneFieldElement,
  ResolverOptionsSource,
  SearchOptionsSource,
  SelectFieldElement,
  SelectOption,
  StaticOptionsSource,
  TextFieldElement,
} from "./elements";

export {
  isArrayFieldElement,
  isColumnElement,
  isContainerElement,
  isCustomFieldElement,
  isFieldElement,
} from "./elements";
// Event types
export type {
  FormData,
  OnChangeHandler,
  OnErrorHandler,
  OnResetHandler,
  OnSubmitHandler,
  OnValidationChangeHandler,
} from "./events";
// Field component types
export type {
  ArrayFieldComponent,
  ArrayFieldProps,
  BaseFieldComponent,
  BaseFieldProps,
  BooleanFieldComponent,
  BooleanFieldProps,
  // Container component types (Phase 2)
  ColumnComponent,
  ColumnProps,
  ContainerComponent,
  ContainerProps,
  CustomComponentRegistry,
  CustomContainerRegistry,
  CustomFieldComponent,
  CustomFieldProps,
  DateFieldComponent,
  DateFieldProps,
  EmailFieldComponent,
  EmailFieldProps,
  FieldComponentRegistry,
  FieldProps,
  PhoneFieldComponent,
  PhoneFieldProps,
  SelectFieldComponent,
  SelectFieldProps,
  TextFieldComponent,
  TextFieldProps,
} from "./fields";
export type {
  InvisibleFieldValidation,
  JsonLogicRule,
  ValidationConfig,
} from "./validation";
