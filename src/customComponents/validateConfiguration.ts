import type {
  ArrayFieldElement,
  ContainerElement,
  CustomComponentRegistry,
  FieldElement,
  FormConfiguration,
  FormElement,
} from "@/types";
import { isArrayFieldElement, isContainerElement } from "@/types";
import {
  isCustomElement,
  type ValidatedCustomElement,
  validateCustomElement,
} from "./validateCustomElement";

export interface ValidateCustomComponentsOptions {
  /** Allow missing custom components to be handled by render-time fallback */
  allowMissingCustomComponents?: boolean;
}

/**
 * Recursively validate all custom elements in a form configuration.
 */
export function validateCustomComponents(
  config: FormConfiguration,
  registry: CustomComponentRegistry = {},
  options: ValidateCustomComponentsOptions = {}
): FormConfiguration {
  const validatedElements = validateElements(
    config.elements,
    registry,
    "elements",
    options
  );

  return {
    ...config,
    elements: validatedElements,
  };
}

function validateElements(
  elements: FormElement[],
  registry: CustomComponentRegistry,
  basePath: string,
  options: ValidateCustomComponentsOptions
): FormElement[] {
  return elements.map((element, index) => {
    const path = `${basePath}[${index}]`;
    return validateElement(element, registry, path, options);
  });
}

function validateElement(
  element: FormElement,
  registry: CustomComponentRegistry,
  path: string,
  options: ValidateCustomComponentsOptions
): FormElement {
  if (isCustomElement(element)) {
    if (options.allowMissingCustomComponents && !registry[element.component]) {
      return element;
    }
    return validateCustomElement(element, registry, path);
  }

  if (isContainerElement(element)) {
    return validateContainer(element, registry, path, options);
  }

  if (isArrayFieldElement(element)) {
    return validateArrayField(element, registry, path, options);
  }

  return element;
}

function validateContainer(
  container: ContainerElement,
  registry: CustomComponentRegistry,
  path: string,
  options: ValidateCustomComponentsOptions
): ContainerElement {
  if (!container.children) {
    return container;
  }

  return {
    ...container,
    children: validateElements(
      container.children,
      registry,
      `${path}.children`,
      options
    ),
  };
}

function validateArrayField(
  arrayField: ArrayFieldElement,
  registry: CustomComponentRegistry,
  path: string,
  options: ValidateCustomComponentsOptions
): ArrayFieldElement {
  return {
    ...arrayField,
    itemFields: validateElements(
      arrayField.itemFields,
      registry,
      `${path}.itemFields`,
      options
    ) as FieldElement[],
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
    return;
  }

  if (isArrayFieldElement(element)) {
    collectFromElements(element.itemFields, results);
  }
}
