import type { CustomFieldElement } from "../types/elements";
import { ConfigurationError } from "./ConfigurationError";
import {
  type CustomComponentDefinition,
  type CustomComponentRegistry,
  normalizeComponentDefinition,
} from "./types";

export interface ValidatedCustomElement extends CustomFieldElement {
  componentProps: Record<string, unknown>;
  __definition?: CustomComponentDefinition;
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

  if (definition.propsSchema) {
    const result = definition.propsSchema.safeParse(mergedProps);

    if (!result.success) {
      const componentName = definition.displayName || element.component;
      const errors = result.error.issues
        .map(
          (issue) => `  - ${issue.path.join(".") || "root"}: ${issue.message}`
        )
        .join("\n");

      throw new ConfigurationError(
        `Invalid props for "${componentName}" at ${path}:\n${errors}`,
        path,
        element.component
      );
    }

    return {
      ...element,
      componentProps: result.data as Record<string, unknown>,
      __definition: definition,
    };
  }

  return {
    ...element,
    componentProps: mergedProps,
    __definition: definition,
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
