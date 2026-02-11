import { useDynamicFormContext } from "../hooks";
import type { ContainerElement } from "../types";
import { ElementRenderer } from "./ElementRenderer";

/**
 * Props for the ContainerRenderer component.
 */
export interface ContainerRendererProps {
  /** Container element configuration */
  config: ContainerElement;
}

/**
 * Renders a container element by delegating to a consumer-provided component.
 *
 * The ContainerRenderer:
 * 1. Looks up container component by variant from components.containers
 * 2. If no matching container registered, renders children directly (no wrapper)
 * 3. Container component receives full config (including meta data) and rendered children
 *
 * The engine renders only direct `children` elements.
 * All layout-specific data is passed via `config.meta` — the container component decides layout.
 */
export const ContainerRenderer: React.FC<ContainerRendererProps> = ({
  config,
}) => {
  const { components } = useDynamicFormContext();
  const containers = components.containers ?? {};

  // Engine renders only direct children elements
  const renderedChildren =
    config.children && config.children.length > 0
      ? config.children.map((element, idx) => {
          const key =
            "name" in element && element.name
              ? String(element.name)
              : `element-${idx}`;
          return <ElementRenderer config={element} key={key} />;
        })
      : null;

  // Look up container component by variant
  const variant = config.variant ?? "default";
  const ContainerComp = containers[variant] ?? containers.default;

  if (!ContainerComp) {
    return <>{renderedChildren}</>;
  }

  return <ContainerComp config={config}>{renderedChildren}</ContainerComp>;
};

ContainerRenderer.displayName = "ContainerRenderer";
