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
  BaseFieldElement,
  ContainerElement,
  CustomFieldElement,
  ElementType,
  FieldElement,
  FieldType,
  FormElement,
  LayoutElement,
  MapOptionsSource,
  OptionsSource,
  ResolverOptionsSource,
  SearchOptionsSource,
  SelectFieldElement,
  SelectOption,
  StaticOptionsSource,
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
  // Unified component registry
  ComponentRegistry,
  ContainerComponent,
  ContainerProps,
  CustomContainerRegistry,
  CustomFieldComponent,
  CustomFieldProps,
  FieldComponentRegistry,
  FieldProps,
  SelectFieldComponent,
  SelectFieldProps,
} from "./fields";
export type {
  InvisibleFieldValidation,
  JsonLogicRule,
  ValidationConfig,
} from "./validation";
