import type {
  ContainerElement,
  CustomComponentRegistry,
  FormConfiguration,
  FormElement,
} from "@/types";
import { isContainerElement } from "@/types";
import {
  isCustomElement,
  type ValidatedCustomElement,
  validateCustomElement,
} from "./validateCustomElement";

/**
 * Recursively validate all custom elements in a form configuration.
 */
export function validateCustomComponents(
  config: FormConfiguration,
  registry: CustomComponentRegistry = {}
): FormConfiguration {
  const validatedElements = validateElements(
    config.elements,
    registry,
    "elements"
  );

  return {
    ...config,
    elements: validatedElements,
  };
}

function validateElements(
  elements: FormElement[],
  registry: CustomComponentRegistry,
  basePath: string
): FormElement[] {
  return elements.map((element, index) => {
    const path = `${basePath}[${index}]`;
    return validateElement(element, registry, path);
  });
}

function validateElement(
  element: FormElement,
  registry: CustomComponentRegistry,
  path: string
): FormElement {
  if (isCustomElement(element)) {
    return validateCustomElement(element, registry, path);
  }

  if (isContainerElement(element)) {
    return validateContainer(element, registry, path);
  }

  return element;
}

function validateContainer(
  container: ContainerElement,
  registry: CustomComponentRegistry,
  path: string
): ContainerElement {
  if (!container.children) {
    return container;
  }

  return {
    ...container,
    children: validateElements(
      container.children,
      registry,
      `${path}.children`
    ),
  };
}

/**
 * Collect all custom elements from a form configuration.
 */
export function getValidatedCustomElements(
  config: FormConfiguration
): ValidatedCustomElement[] {
  const results: ValidatedCustomElement[] = [];
  collectFromElements(config.elements, results);
  return results;
}

function collectFromElements(
  elements: FormElement[],
  results: ValidatedCustomElement[]
): void {
  for (const element of elements) {
    collectFromElement(element, results);
  }
}

function collectFromElement(
  element: FormElement,
  results: ValidatedCustomElement[]
): void {
  if (isCustomElement(element)) {
    const componentProps =
      typeof element.componentProps === "object" &&
      element.componentProps !== null
        ? element.componentProps
        : {};
    results.push({
      ...element,
      componentProps: componentProps as Record<string, unknown>,
    });
    return;
  }

  if (isContainerElement(element) && element.children) {
    collectFromElements(element.children, results);
  }
}
