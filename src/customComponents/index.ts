// Custom component types and utilities
export { ConfigurationError } from "./ConfigurationError";
export type {
  CustomComponentDefinition,
  CustomComponentRegistry,
  CustomComponentRenderProps,
} from "./types";
export {
  isCustomComponentDefinition,
  normalizeComponentDefinition,
} from "./types";
export {
  getValidatedCustomElements,
  validateCustomComponents,
} from "./validateConfiguration";
export {
  isCustomElement,
  type ValidatedCustomElement,
  validateCustomElement,
} from "./validateCustomElement";
