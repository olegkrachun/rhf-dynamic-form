import type { ContainerElement, FieldElement, FormElement } from "../types";
import { isContainerElement, isFieldElement } from "../types";
import { evaluateCondition } from "../validation";
import { collectVars } from "./collectVars";

/**
 * Visibility state for all fields in the form.
 * Maps field names to their visibility (true = visible).
 */
export type VisibilityState = Record<string, boolean>;

/**
 * Collects the form paths that can change field/container visibility.
 * DynamicForm uses this index to avoid walking the entire configuration for
 * changes that cannot possibly affect visibility.
 */
export const collectVisibilityDependencies = (
  elements: FormElement[]
): Set<string> => {
  const dependencies = new Set<string>();

  const visit = (element: FormElement): void => {
    if (element.visible) {
      for (const path of collectVars(element.visible)) {
        dependencies.add(path);
      }
    }
    if (isContainerElement(element)) {
      for (const child of element.children ?? []) {
        visit(child);
      }
    }
  };

  for (const element of elements) {
    visit(element);
  }
  return dependencies;
};

export const canAffectVisibility = (
  changedPath: string,
  dependencies: Set<string>
): boolean => {
  for (const dependency of dependencies) {
    if (
      dependency === "" ||
      dependency === changedPath ||
      dependency.startsWith(`${changedPath}.`) ||
      changedPath.startsWith(`${dependency}.`)
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Compare two visibility states and return the new state only if changed.
 * Returns prev if no change (preserves reference equality for React).
 */
export const getUpdatedVisibility = (
  prev: VisibilityState,
  next: VisibilityState
): VisibilityState => {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    if (prev[key] !== next[key]) {
      return next;
    }
  }
  return prev;
};

/**
 * Calculate visibility state for all fields based on their visibility rules.
 * Evaluates JSON Logic rules against current form data.
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
    }
  };

  const processField = (field: FieldElement, parentVisible: boolean): void => {
    if (!parentVisible) {
      visibility[field.name] = false;
      return;
    }

    if (!field.visible) {
      visibility[field.name] = true;
      return;
    }

    visibility[field.name] = evaluateCondition(field.visible, formData);
  };

  const processContainer = (
    container: ContainerElement,
    parentVisible: boolean
  ): void => {
    let containerVisible = parentVisible;

    if (container.visible && parentVisible) {
      containerVisible = evaluateCondition(container.visible, formData);
    }

    if (container.children) {
      for (const child of container.children) {
        processElement(child, containerVisible);
      }
    }
  };

  for (const element of elements) {
    processElement(element, true);
  }

  return visibility;
};
