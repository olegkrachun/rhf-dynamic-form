import type { FC } from "react";
import type { FormElement } from "../types";
import { isContainerElement, isFieldElement } from "../types";
import { ContainerRenderer } from "./ContainerRenderer";
import { FieldRenderer } from "./FieldRenderer";

/**
 * Props for the ElementRenderer component.
 */
export interface ElementRendererProps {
  /** Form element configuration (field or container) */
  config: FormElement;
}

/**
 * Dispatches rendering to the appropriate component based on element type.
 *
 * The engine knows only two rendering paths:
 * - field → FieldRenderer → components.fields[type] or components.custom[name]
 * - container → ContainerRenderer → components.containers[variant]
 *
 * Columns are NOT rendered by the engine — they are data inside container config.
 * The container component decides how to lay out its columns.
 */
export const ElementRenderer: FC<ElementRendererProps> = ({ config }) => {
  if (isFieldElement(config)) {
    return <FieldRenderer config={config} />;
  }

  if (isContainerElement(config)) {
    return <ContainerRenderer config={config} />;
  }

  return null;
};

ElementRenderer.displayName = "ElementRenderer";
