import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { CustomFieldElement } from "../types/elements";
import { ConfigurationError } from "./ConfigurationError";
import type { CustomComponentRegistry } from "./types";
import {
  isCustomElement,
  validateCustomElement,
} from "./validateCustomElement";

const MockComponent = () => null;

describe("validateCustomElement", () => {
  const propsSchema = z.object({
    maxStars: z.number().int().min(1).max(10),
    showValue: z.boolean().default(true),
  });

  const registry: CustomComponentRegistry = {
    RatingField: {
      component: MockComponent,
      propsSchema,
      defaultProps: { maxStars: 5 },
    },
    SimpleComponent: MockComponent,
  };

  it("validates element with full definition", () => {
    const element: CustomFieldElement = {
      type: "custom",
      name: "rating",
      component: "RatingField",
      componentProps: { maxStars: 10 },
    };

    const result = validateCustomElement(element, registry, "elements[0]");

    expect(result.componentProps).toEqual({
      maxStars: 10,
      showValue: true,
    });
    expect(result.__definition).toBeDefined();
  });

  it("merges default props with provided props", () => {
    const element: CustomFieldElement = {
      type: "custom",
      name: "rating",
      component: "RatingField",
      componentProps: { showValue: false },
    };

    const result = validateCustomElement(element, registry, "elements[0]");

    expect(result.componentProps).toEqual({
      maxStars: 5,
      showValue: false,
    });
  });

  it("works with raw component (no schema)", () => {
    const element: CustomFieldElement = {
      type: "custom",
      name: "simple",
      component: "SimpleComponent",
      componentProps: { anyProp: "value" },
    };

    const result = validateCustomElement(element, registry, "elements[0]");

    expect(result.componentProps).toEqual({ anyProp: "value" });
  });

  it("throws for unknown component", () => {
    const element: CustomFieldElement = {
      type: "custom",
      name: "unknown",
      component: "UnknownComponent",
    };

    expect(() =>
      validateCustomElement(element, registry, "elements[0]")
    ).toThrow(ConfigurationError);
  });

  it("throws for invalid props", () => {
    const element: CustomFieldElement = {
      type: "custom",
      name: "rating",
      component: "RatingField",
      componentProps: { maxStars: 100 },
    };

    expect(() =>
      validateCustomElement(element, registry, "elements[0]")
    ).toThrow(ConfigurationError);
  });

  it("includes available components in error message", () => {
    const element: CustomFieldElement = {
      type: "custom",
      name: "unknown",
      component: "Missing",
    };

    expect(() =>
      validateCustomElement(element, registry, "elements[0]")
    ).toThrow(ConfigurationError);

    try {
      validateCustomElement(element, registry, "elements[0]");
    } catch (error) {
      expect((error as ConfigurationError).message).toContain("RatingField");
      expect((error as ConfigurationError).message).toContain(
        "SimpleComponent"
      );
    }
  });

  it("shows empty registry message when no components registered", () => {
    const element: CustomFieldElement = {
      type: "custom",
      name: "test",
      component: "Missing",
    };

    expect(() => validateCustomElement(element, {}, "elements[0]")).toThrow(
      ConfigurationError
    );

    try {
      validateCustomElement(element, {}, "elements[0]");
    } catch (error) {
      expect((error as ConfigurationError).message).toContain(
        "No custom components registered"
      );
    }
  });

  it("includes error path in validation errors", () => {
    const element: CustomFieldElement = {
      type: "custom",
      name: "rating",
      component: "RatingField",
      componentProps: { maxStars: -1 },
    };

    expect(() =>
      validateCustomElement(element, registry, "elements[5]")
    ).toThrow(ConfigurationError);

    try {
      validateCustomElement(element, registry, "elements[5]");
    } catch (error) {
      expect((error as ConfigurationError).path).toBe("elements[5]");
      expect((error as ConfigurationError).component).toBe("RatingField");
    }
  });
});

describe("isCustomElement", () => {
  it("returns true for custom elements", () => {
    expect(
      isCustomElement({ type: "custom", name: "test", component: "X" })
    ).toBe(true);
  });

  it("returns false for non-custom elements", () => {
    expect(isCustomElement({ type: "text", name: "test" })).toBe(false);
    expect(isCustomElement({ type: "container" })).toBe(false);
  });

  it("returns false for non-objects", () => {
    expect(isCustomElement(null)).toBe(false);
    expect(isCustomElement(undefined)).toBe(false);
    expect(isCustomElement("custom")).toBe(false);
    expect(isCustomElement(123)).toBe(false);
  });
});
