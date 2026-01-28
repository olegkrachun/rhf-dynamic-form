import type { CustomFieldElement } from "../types/elements";
import { ConfigurationError } from "./ConfigurationError";
import {
  type CustomComponentRegistry,
  normalizeComponentDefinition,
} from "./types";

export interface ValidatedCustomElement extends CustomFieldElement {
  componentProps: Record<string, unknown>;
}

/**
 * Validate custom element against its component definition.
 */
export function validateCustomElement(
  element: CustomFieldElement,
  registry: CustomComponentRegistry,
  path: string
): ValidatedCustomElement {
  const entry = registry[element.component];

  if (!entry) {
    const available = Object.keys(registry);
    const availableMessage =
      available.length > 0
        ? `Available components: ${available.join(", ")}`
        : "No custom components registered.";

    throw new ConfigurationError(
      `Unknown custom component "${element.component}" at ${path}. ${availableMessage}`,
      path,
      element.component
    );
  }

  const definition = normalizeComponentDefinition(entry, element.component);

  const mergedProps: Record<string, unknown> = {
    ...definition.defaultProps,
    ...element.componentProps,
  };

  return {
    ...element,
    componentProps: mergedProps,
  };
}

export function isCustomElement(
  element: unknown
): element is CustomFieldElement {
  return (
    typeof element === "object" &&
    element !== null &&
    "type" in element &&
    (element as { type: string }).type === "custom" &&
    "component" in element &&
    typeof (element as { component: unknown }).component === "string"
  );
}
