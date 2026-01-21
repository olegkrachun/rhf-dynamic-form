import type React from "react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineCustomComponent } from "./defineCustomComponent";
import type { CustomComponentRenderProps } from "./types";

const MockComponent = () => null;

describe("defineCustomComponent", () => {
  it("returns definition unchanged", () => {
    const propsSchema = z.object({ maxStars: z.number() });
    const definition = defineCustomComponent({
      component: MockComponent as unknown as React.ComponentType<
        CustomComponentRenderProps<{ maxStars: number }>
      >,
      propsSchema,
      defaultProps: { maxStars: 5 },
    });

    expect(definition.component).toBe(MockComponent);
    expect(definition.defaultProps).toEqual({ maxStars: 5 });
    expect(definition.propsSchema).toBe(propsSchema);
  });

  it("works with minimal definition", () => {
    const definition = defineCustomComponent({
      component: MockComponent as unknown as React.ComponentType<
        CustomComponentRenderProps<Record<string, unknown>>
      >,
    });

    expect(definition.component).toBe(MockComponent);
    expect(definition.defaultProps).toBeUndefined();
    expect(definition.propsSchema).toBeUndefined();
  });

  it("preserves all optional fields", () => {
    const definition = defineCustomComponent({
      component: MockComponent as unknown as React.ComponentType<
        CustomComponentRenderProps<{ value: string }>
      >,
      description: "A test component",
      displayName: "TestField",
      defaultProps: { value: "default" },
    });

    expect(definition.description).toBe("A test component");
    expect(definition.displayName).toBe("TestField");
    expect(definition.defaultProps).toEqual({ value: "default" });
  });
});
