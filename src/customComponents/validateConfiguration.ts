import type { FormConfiguration } from "../types/config";
import type {
  ColumnElement,
  ContainerElement,
  FormElement,
} from "../types/elements";
import type { CustomComponentRegistry } from "./types";
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

  if (isColumnElement(element)) {
    return validateColumn(element, registry, path);
  }

  return element;
}

function validateContainer(
  container: ContainerElement,
  registry: CustomComponentRegistry,
  path: string
): ContainerElement {
  const validatedColumns = container.columns.map((column, index) =>
    validateColumn(column, registry, `${path}.columns[${index}]`)
  );

  return {
    ...container,
    columns: validatedColumns,
  };
}

function validateColumn(
  column: ColumnElement,
  registry: CustomComponentRegistry,
  path: string
): ColumnElement {
  const validatedElements = validateElements(
    column.elements,
    registry,
    `${path}.elements`
  );

  return {
    ...column,
    elements: validatedElements,
  };
}

function isContainerElement(element: FormElement): element is ContainerElement {
  return element.type === "container";
}

function isColumnElement(element: FormElement): element is ColumnElement {
  return element.type === "column";
}

/**
 * Collect all custom elements from a form configuration.
 * Returns elements with normalized componentProps (defaults to empty object).
 *
 * @remarks For full validation including propsSchema checks, pass the config
 * through validateCustomComponents first.
 */
export function getValidatedCustomElements(
  config: FormConfiguration
): ValidatedCustomElement[] {
  const results: ValidatedCustomElement[] = [];

  function collectFromElements(elements: FormElement[]): void {
    for (const element of elements) {
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
      } else if (isContainerElement(element)) {
        for (const column of element.columns) {
          collectFromElements(column.elements);
        }
      } else if (isColumnElement(element)) {
        collectFromElements(element.elements);
      }
    }
  }

  collectFromElements(config.elements);
  return results;
}
