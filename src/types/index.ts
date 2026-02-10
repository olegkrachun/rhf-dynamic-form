// Validation types

// Custom component types (Phase 5)
export type {
  CustomComponentDefinition,
  CustomComponentRegistry,
  CustomComponentRenderProps,
} from "../customComponents";
// Configuration types
export type {
  DynamicFormProps,
  DynamicFormRef,
  FieldWrapperFunction,
  FieldWrapperProps,
  FormConfiguration,
} from "./config";

// Element types
export type {
  ApiOptionsSource,
  ArrayFieldElement,
  BooleanFieldElement,
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
  isContainerElement,
  isCustomFieldElement,
  isFieldElement,
  isSectionContainer,
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
  // Unified component registry
  ComponentRegistry,
  ContainerComponent,
  ContainerProps,
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
