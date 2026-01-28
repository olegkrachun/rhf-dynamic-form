import { describe, expect, it } from "vitest";
import {
  isCustomComponentDefinition,
  normalizeComponentDefinition,
} from "./types";

const MockComponent = () => null;

// Helper to test type guard with arbitrary values
const checkDefinition = isCustomComponentDefinition as (v: unknown) => boolean;

describe("types", () => {
  describe("isCustomComponentDefinition", () => {
    it("returns true for objects with component property", () => {
      const definition = { component: MockComponent };
      expect(isCustomComponentDefinition(definition)).toBe(true);
    });

    it("returns false for raw React components", () => {
      expect(isCustomComponentDefinition(MockComponent)).toBe(false);
    });

    it("returns false for non-objects", () => {
      expect(checkDefinition(null)).toBe(false);
      expect(checkDefinition(undefined)).toBe(false);
      expect(checkDefinition("string")).toBe(false);
    });

    it("returns false for objects without component function", () => {
      expect(checkDefinition({ component: "not-a-function" })).toBe(false);
      expect(checkDefinition({ other: MockComponent })).toBe(false);
    });
  });

  describe("normalizeComponentDefinition", () => {
    it("wraps raw component in definition", () => {
      const result = normalizeComponentDefinition(
        MockComponent,
        "TestComponent"
      );

      expect(result.component).toBe(MockComponent);
      expect(result.displayName).toBe("TestComponent");
      expect(result.propsSchema).toBeUndefined();
      expect(result.defaultProps).toBeUndefined();
    });

    it("preserves existing definition properties", () => {
      const definition = {
        component: MockComponent,
        defaultProps: { foo: "bar" },
        displayName: "Original",
        description: "Test description",
      };

      const result = normalizeComponentDefinition(definition, "Ignored");

      expect(result.component).toBe(MockComponent);
      expect(result.defaultProps).toEqual({ foo: "bar" });
      expect(result.displayName).toBe("Original");
      expect(result.description).toBe("Test description");
    });

    it("uses name as displayName when definition has none", () => {
      const definition = { component: MockComponent };

      const result = normalizeComponentDefinition(definition, "FallbackName");

      expect(result.displayName).toBe("FallbackName");
    });
  });
});
