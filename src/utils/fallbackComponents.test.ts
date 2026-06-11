import { describe, expect, it } from "vitest";
import type { FallbackComponent, FallbackComponentRegistry } from "../types";
import {
  hasFallbackComponent,
  resolveFallbackComponent,
} from "./fallbackComponents";

const AllFallback: FallbackComponent = () => null;
const FieldFallback: FallbackComponent = () => null;
const CustomFallback: FallbackComponent = () => null;

describe("fallbackComponents", () => {
  describe("resolveFallbackComponent", () => {
    it("uses field fallback before all fallback for field misses", () => {
      const fallback: FallbackComponentRegistry = {
        all: AllFallback,
        field: FieldFallback,
      };

      expect(resolveFallbackComponent(fallback, "field")).toBe(FieldFallback);
    });

    it("uses custom fallback before all fallback for custom misses", () => {
      const fallback: FallbackComponentRegistry = {
        all: AllFallback,
        custom: CustomFallback,
      };

      expect(resolveFallbackComponent(fallback, "custom")).toBe(CustomFallback);
    });

    it("uses all fallback when a field-specific fallback is missing", () => {
      expect(resolveFallbackComponent({ all: AllFallback }, "field")).toBe(
        AllFallback
      );
    });

    it("uses all fallback when a custom-specific fallback is missing", () => {
      expect(resolveFallbackComponent({ all: AllFallback }, "custom")).toBe(
        AllFallback
      );
    });

    it("returns undefined when no fallback matches", () => {
      expect(resolveFallbackComponent(undefined, "field")).toBeUndefined();
      expect(resolveFallbackComponent({}, "custom")).toBeUndefined();
    });
  });

  describe("hasFallbackComponent", () => {
    it("returns true when a fallback resolves", () => {
      expect(hasFallbackComponent({ field: FieldFallback }, "field")).toBe(
        true
      );
      expect(hasFallbackComponent({ all: AllFallback }, "custom")).toBe(true);
    });

    it("returns false when no fallback resolves", () => {
      expect(hasFallbackComponent(undefined, "field")).toBe(false);
      expect(hasFallbackComponent({}, "custom")).toBe(false);
    });
  });
});
