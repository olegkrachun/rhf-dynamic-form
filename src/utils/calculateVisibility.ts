import type {
  ColumnElement,
  ContainerElement,
  FieldElement,
  FormElement,
} from "../types";
import { isColumnElement, isContainerElement, isFieldElement } from "../types";
import { evaluateCondition } from "../validation";

/**
 * Visibility state for all fields in the form.
 * Maps field names to their visibility (true = visible).
 */
export type VisibilityState = Record<string, boolean>;

/**
 * Calculate visibility state for all fields based on their visibility rules.
 * Evaluates JSON Logic rules against current form data.
 *
 * @param elements - Array of form elements
 * @param formData - Current form values
 * @returns Visibility state for all fields
 *
 * @example
 * ```typescript
 * const elements = [
 *   { type: 'text', name: 'reason', visible: { "==": [{ "var": "type" }, "other"] } },
 *   { type: 'text', name: 'name' }
 * ];
 *
 * const visibility = calculateVisibility(elements, { type: 'other' });
 * // Returns: { reason: true, name: true }
 *
 * const visibility2 = calculateVisibility(elements, { type: 'standard' });
 * // Returns: { reason: false, name: true }
 * ```
 */
export const calculateVisibility = (
  elements: FormElement[],
  formData: Record<string, unknown>
): VisibilityState => {
  const visibility: VisibilityState = {};

  const processElement = (
    element: FormElement,
    parentVisible: boolean
  ): void => {
    if (isFieldElement(element)) {
      processField(element, parentVisible);
    } else if (isContainerElement(element)) {
      processContainer(element, parentVisible);
    } else if (isColumnElement(element)) {
      processColumn(element, parentVisible);
    }
  };

  const processField = (field: FieldElement, parentVisible: boolean): void => {
    // If parent is not visible, field is also not visible
    if (!parentVisible) {
      visibility[field.name] = false;
      return;
    }

    // If no visibility rule, field is visible
    if (!field.visible) {
      visibility[field.name] = true;
      return;
    }

    // Evaluate visibility rule
    visibility[field.name] = evaluateCondition(field.visible, formData);
  };

  const processContainer = (
    container: ContainerElement,
    parentVisible: boolean
  ): void => {
    // Calculate container's own visibility
    let containerVisible = parentVisible;

    if (container.visible && parentVisible) {
      containerVisible = evaluateCondition(container.visible, formData);
    }

    // Process columns within container
    for (const column of container.columns) {
      processColumn(column, containerVisible);
    }
  };

  const processColumn = (
    column: ColumnElement,
    parentVisible: boolean
  ): void => {
    // Calculate column's own visibility
    let columnVisible = parentVisible;

    if (column.visible && parentVisible) {
      columnVisible = evaluateCondition(column.visible, formData);
    }

    // Process elements within column
    for (const element of column.elements) {
      processElement(element, columnVisible);
    }
  };

  // Process all root elements
  for (const element of elements) {
    processElement(element, true);
  }

  return visibility;
};
