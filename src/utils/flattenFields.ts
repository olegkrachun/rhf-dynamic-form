import type { ContainerElement, FieldElement, FormElement } from "@/types";
import { isContainerElement, isFieldElement } from "@/types";

/**
 * Recursively extracts all field elements from a form configuration.
 * Traverses containers and their children to find nested fields.
 *
 * @param elements - Array of form elements (may include containers)
 * @returns Flat array of all field elements
 */
export const flattenFields = (elements: FormElement[]): FieldElement[] => {
  const fields: FieldElement[] = [];

  const processElement = (element: FormElement): void => {
    if (isFieldElement(element)) {
      fields.push(element);
    } else if (isContainerElement(element)) {
      processContainer(element);
    }
  };

  const processContainer = (container: ContainerElement): void => {
    if (container.children) {
      for (const child of container.children) {
        processElement(child);
      }
    }
  };

  for (const element of elements) {
    processElement(element);
  }

  return fields;
};

/**
 * Gets all field names from a form configuration.
 * Useful for initializing form state or visibility tracking.
 *
 * @param elements - Array of form elements
 * @returns Array of field names (including nested paths like 'source.name')
 */
export const getFieldNames = (elements: FormElement[]): string[] => {
  return flattenFields(elements).map((field) => field.name);
};
