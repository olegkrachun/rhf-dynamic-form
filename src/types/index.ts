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
  DataMapOptions,
  ElementType,
  FieldElement,
  FieldType,
  FormElement,
  LayoutElement,
  MapOptionsSource,
  OptionsSource,
  ResolverOptions,
  ResolverOptionsSource,
  SearchOptionsSource,
  SelectFieldElement,
  SelectOption,
  SelectOptionsConfig,
  StaticOptionsSource,
} from "./elements";

export {
  isArrayFieldElement,
  isContainerElement,
  isCustomFieldElement,
  isDataMapOptions,
  isFieldElement,
  isResolverOptions,
  isSectionContainer,
  isStaticOptions,
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
  FallbackComponent,
  FallbackComponentProps,
  FallbackComponentRegistry,
  FieldComponentRegistry,
  FieldProps,
  MissingComponentInfo,
  MissingComponentKind,
  OptionsResolver,
  SelectFieldComponent,
  SelectFieldProps,
} from "./fields";
export type {
  InvisibleFieldValidation,
  JsonLogicRule,
  ValidationConfig,
} from "./validation";
