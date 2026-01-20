import type {
  ColumnElement,
  ContainerElement,
  FieldElement,
  FormElement,
} from "../types";
import { isColumnElement, isContainerElement, isFieldElement } from "../types";

/**
 * Recursively extracts all field elements from a form configuration.
 * Traverses containers and columns to find nested fields.
 *
 * @param elements - Array of form elements (may include containers/columns)
 * @returns Flat array of all field elements
 *
 * @example
 * ```typescript
 * const config = {
 *   elements: [
 *     { type: 'text', name: 'name' },
 *     {
 *       type: 'container',
 *       columns: [{
 *         type: 'column',
 *         width: '50%',
 *         elements: [{ type: 'email', name: 'email' }]
 *       }]
 *     }
 *   ]
 * };
 *
 * const fields = flattenFields(config.elements);
 * // Returns: [{ type: 'text', name: 'name' }, { type: 'email', name: 'email' }]
 * ```
 */
export const flattenFields = (elements: FormElement[]): FieldElement[] => {
  const fields: FieldElement[] = [];

  const processElement = (element: FormElement): void => {
    if (isFieldElement(element)) {
      fields.push(element);
    } else if (isContainerElement(element)) {
      processContainer(element);
    } else if (isColumnElement(element)) {
      processColumn(element);
    }
  };

  const processContainer = (container: ContainerElement): void => {
    for (const column of container.columns) {
      processColumn(column);
    }
  };

  const processColumn = (column: ColumnElement): void => {
    for (const element of column.elements) {
      processElement(element);
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
