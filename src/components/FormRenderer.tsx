import type React from "react";
import type { FormElement } from "../types";
import { ElementRenderer } from "./ElementRenderer";

/**
 * Props for the FormRenderer component.
 */
export interface FormRendererProps {
  /** Array of form elements to render */
  elements: FormElement[];
}

/**
 * Renders all form elements from the configuration.
 *
 * Maps over the elements array and renders each element using ElementRenderer.
 * Elements are rendered vertically (one under another) in Phase 1.
 *
 * @example
 * ```tsx
 * const elements = [
 *   { type: 'text', name: 'name', label: 'Name' },
 *   { type: 'email', name: 'email', label: 'Email' },
 * ];
 *
 * <FormRenderer elements={elements} />
 * ```
 */
export const FormRenderer: React.FC<FormRendererProps> = ({ elements }) => {
  return (
    <>
      {elements.map((element, index) => {
        // Generate a stable key for each element
        // For fields, use the name; for containers, use index
        const key =
          "name" in element && element.name
            ? String(element.name)
            : `element-${index}`;

        return <ElementRenderer config={element} key={key} />;
      })}
    </>
  );
};

FormRenderer.displayName = "FormRenderer";
