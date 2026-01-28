import type {
  ControllerFieldState,
  ControllerRenderProps,
} from "react-hook-form";
import type { ZodObject, ZodRawShape } from "zod";
import type { CustomFieldElement } from "../types/elements";
import type { FormData } from "../types/events";

export interface CustomComponentRenderProps<
  TProps extends Record<string, unknown> = Record<string, unknown>,
> {
  field: ControllerRenderProps;
  fieldState: ControllerFieldState;
  config: CustomFieldElement;
  componentProps: TProps;
  formValues: FormData;
  setValue: (name: string, value: unknown) => void;
}

export interface CustomComponentDefinition<
  TProps extends Record<string, unknown> = Record<string, unknown>,
> {
  component: React.ComponentType<CustomComponentRenderProps<TProps>>;
  propsSchema?: ZodObject<ZodRawShape>;
  defaultProps?: Partial<TProps>;
  description?: string;
  displayName?: string;
}

export type CustomComponentRegistry = Record<
  string,
  // biome-ignore lint/suspicious/noExplicitAny: Allow both full definition and legacy component format
  CustomComponentDefinition<any> | React.ComponentType<any>
>;

export const isCustomComponentDefinition = (
  entry: CustomComponentDefinition | React.ComponentType<unknown>
): entry is CustomComponentDefinition => {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "component" in entry &&
    typeof entry.component === "function"
  );
};

export const normalizeComponentDefinition = (
  entry: CustomComponentDefinition | React.ComponentType<unknown>,
  name: string
): CustomComponentDefinition => {
  if (isCustomComponentDefinition(entry)) {
    return {
      ...entry,
      displayName: entry.displayName ?? name,
    };
  }

  return {
    component: entry as React.ComponentType<CustomComponentRenderProps>,
    displayName: name,
  };
};
