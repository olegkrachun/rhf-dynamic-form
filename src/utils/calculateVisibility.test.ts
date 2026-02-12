import { describe, expect, it } from "vitest";
import type { BaseFieldElement, ContainerElement, FormElement } from "../types";
import {
  calculateVisibility,
  getUpdatedVisibility,
} from "./calculateVisibility";

describe("calculateVisibility", () => {
  describe("field visibility", () => {
    it("should mark field as visible when no visibility rule", () => {
      const elements: FormElement[] = [
        { type: "text", name: "firstName" },
        { type: "email", name: "email" },
      ];

      const result = calculateVisibility(elements, {});

      expect(result.firstName).toBe(true);
      expect(result.email).toBe(true);
    });

    it("should mark field as visible when condition evaluates to true", () => {
      const field: BaseFieldElement = {
        type: "text",
        name: "reason",
        visible: { "==": [{ var: "type" }, "other"] },
      };
      const elements: FormElement[] = [field];

      const result = calculateVisibility(elements, { type: "other" });

      expect(result.reason).toBe(true);
    });

    it("should mark field as invisible when condition evaluates to false", () => {
      const field: BaseFieldElement = {
        type: "text",
        name: "reason",
        visible: { "==": [{ var: "type" }, "other"] },
      };
      const elements: FormElement[] = [field];

      const result = calculateVisibility(elements, { type: "standard" });

      expect(result.reason).toBe(false);
    });

    it("should handle multiple fields with different visibility", () => {
      const elements: FormElement[] = [
        {
          type: "text",
          name: "alwaysVisible",
        },
        {
          type: "text",
          name: "conditionallyVisible",
          visible: { "==": [{ var: "showExtra" }, true] },
        },
        {
          type: "text",
          name: "alsoConditional",
          visible: { "==": [{ var: "showMore" }, true] },
        },
      ];

      const result = calculateVisibility(elements, {
        showExtra: true,
        showMore: false,
      });

      expect(result.alwaysVisible).toBe(true);
      expect(result.conditionallyVisible).toBe(true);
      expect(result.alsoConditional).toBe(false);
    });
  });

  describe("container visibility inheritance", () => {
    it("should mark children as invisible when container is invisible", () => {
      const container: ContainerElement = {
        type: "container",
        visible: { "==": [{ var: "showSection" }, true] },
        children: [
          {
            type: "container",
            variant: "column",
            meta: { width: "100%" },
            children: [
              { type: "text", name: "childField" },
              { type: "email", name: "anotherChild" },
            ],
          },
        ],
      };
      const elements: FormElement[] = [container];

      const result = calculateVisibility(elements, { showSection: false });

      expect(result.childField).toBe(false);
      expect(result.anotherChild).toBe(false);
    });

    it("should allow children to be visible when container is visible", () => {
      const container: ContainerElement = {
        type: "container",
        visible: { "==": [{ var: "showSection" }, true] },
        children: [
          {
            type: "container",
            variant: "column",
            meta: { width: "100%" },
            children: [{ type: "text", name: "childField" }],
          },
        ],
      };
      const elements: FormElement[] = [container];

      const result = calculateVisibility(elements, { showSection: true });

      expect(result.childField).toBe(true);
    });

    it("should handle container without visibility rule", () => {
      const container: ContainerElement = {
        type: "container",
        children: [
          {
            type: "container",
            variant: "column",
            meta: { width: "100%" },
            children: [{ type: "text", name: "childField" }],
          },
        ],
      };
      const elements: FormElement[] = [container];

      const result = calculateVisibility(elements, {});

      expect(result.childField).toBe(true);
    });
  });

  describe("column visibility inheritance", () => {
    it("should mark children as invisible when column is invisible", () => {
      const container: ContainerElement = {
        type: "container",
        children: [
          {
            type: "container",
            variant: "column",
            meta: { width: "50%" },
            visible: { "==": [{ var: "showLeft" }, true] },
            children: [{ type: "text", name: "leftField" }],
          },
          {
            type: "container",
            variant: "column",
            meta: { width: "50%" },
            visible: { "==": [{ var: "showRight" }, true] },
            children: [{ type: "text", name: "rightField" }],
          },
        ],
      };
      const elements: FormElement[] = [container];

      const result = calculateVisibility(elements, {
        showLeft: false,
        showRight: true,
      });

      expect(result.leftField).toBe(false);
      expect(result.rightField).toBe(true);
    });

    it("should inherit invisibility from parent container to column children", () => {
      const container: ContainerElement = {
        type: "container",
        visible: { "==": [{ var: "showAll" }, true] },
        children: [
          {
            type: "container",
            variant: "column",
            meta: { width: "100%" },
            visible: { "==": [{ var: "showColumn" }, true] },
            children: [{ type: "text", name: "nestedField" }],
          },
        ],
      };
      const elements: FormElement[] = [container];

      // Container is invisible, so column and its children are invisible
      // even if column's own condition would be true
      const result = calculateVisibility(elements, {
        showAll: false,
        showColumn: true,
      });

      expect(result.nestedField).toBe(false);
    });
  });

  describe("deeply nested visibility", () => {
    it("should propagate invisibility through deeply nested containers", () => {
      const deeplyNested: ContainerElement = {
        type: "container",
        visible: { "==": [{ var: "level1" }, true] },
        children: [
          {
            type: "container",
            variant: "column",
            meta: { width: "100%" },
            children: [
              {
                type: "container",
                visible: { "==": [{ var: "level2" }, true] },
                children: [
                  {
                    type: "container",
                    variant: "column",
                    meta: { width: "100%" },
                    visible: { "==": [{ var: "level3" }, true] },
                    children: [
                      {
                        type: "text",
                        name: "deepField",
                        visible: { "==": [{ var: "fieldLevel" }, true] },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const elements: FormElement[] = [deeplyNested];

      // All conditions true - field visible
      expect(
        calculateVisibility(elements, {
          level1: true,
          level2: true,
          level3: true,
          fieldLevel: true,
        }).deepField
      ).toBe(true);

      // Level 1 false - field invisible
      expect(
        calculateVisibility(elements, {
          level1: false,
          level2: true,
          level3: true,
          fieldLevel: true,
        }).deepField
      ).toBe(false);

      // Level 2 false - field invisible
      expect(
        calculateVisibility(elements, {
          level1: true,
          level2: false,
          level3: true,
          fieldLevel: true,
        }).deepField
      ).toBe(false);

      // Level 3 false - field invisible
      expect(
        calculateVisibility(elements, {
          level1: true,
          level2: true,
          level3: false,
          fieldLevel: true,
        }).deepField
      ).toBe(false);

      // Field level false - field invisible
      expect(
        calculateVisibility(elements, {
          level1: true,
          level2: true,
          level3: true,
          fieldLevel: false,
        }).deepField
      ).toBe(false);
    });
  });

  describe("JSON Logic operations", () => {
    it("should handle equality comparison", () => {
      const elements: FormElement[] = [
        {
          type: "text",
          name: "test",
          visible: { "==": [{ var: "status" }, "active"] },
        },
      ];

      expect(calculateVisibility(elements, { status: "active" }).test).toBe(
        true
      );
      expect(calculateVisibility(elements, { status: "inactive" }).test).toBe(
        false
      );
    });

    it("should handle AND conditions", () => {
      const elements: FormElement[] = [
        {
          type: "text",
          name: "test",
          visible: {
            and: [
              { "==": [{ var: "a" }, true] },
              { "==": [{ var: "b" }, true] },
            ],
          },
        },
      ];

      expect(calculateVisibility(elements, { a: true, b: true }).test).toBe(
        true
      );
      expect(calculateVisibility(elements, { a: true, b: false }).test).toBe(
        false
      );
      expect(calculateVisibility(elements, { a: false, b: true }).test).toBe(
        false
      );
    });

    it("should handle OR conditions", () => {
      const elements: FormElement[] = [
        {
          type: "text",
          name: "test",
          visible: {
            or: [
              { "==": [{ var: "a" }, true] },
              { "==": [{ var: "b" }, true] },
            ],
          },
        },
      ];

      expect(calculateVisibility(elements, { a: true, b: false }).test).toBe(
        true
      );
      expect(calculateVisibility(elements, { a: false, b: true }).test).toBe(
        true
      );
      expect(calculateVisibility(elements, { a: false, b: false }).test).toBe(
        false
      );
    });

    it("should handle nested variable access", () => {
      const elements: FormElement[] = [
        {
          type: "text",
          name: "test",
          visible: { "==": [{ var: "user.role" }, "admin"] },
        },
      ];

      expect(
        calculateVisibility(elements, { user: { role: "admin" } }).test
      ).toBe(true);
      expect(
        calculateVisibility(elements, { user: { role: "user" } }).test
      ).toBe(false);
    });

    it("should handle missing variables gracefully", () => {
      const elements: FormElement[] = [
        {
          type: "text",
          name: "test",
          visible: { "==": [{ var: "missing" }, "value"] },
        },
      ];

      // Missing variable should result in falsy comparison
      expect(calculateVisibility(elements, {}).test).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should return empty object for empty elements array", () => {
      const result = calculateVisibility([], {});

      expect(result).toEqual({});
    });

    it("should handle container with empty children", () => {
      const container: ContainerElement = {
        type: "container",
        children: [
          {
            type: "container",
            variant: "column",
            meta: { width: "100%" },
            children: [],
          },
        ],
      };

      const result = calculateVisibility([container], {});

      expect(result).toEqual({});
    });

    it("should handle truthy non-boolean values in conditions", () => {
      const elements: FormElement[] = [
        {
          type: "text",
          name: "test",
          visible: { "!!": { var: "value" } },
        },
      ];

      expect(calculateVisibility(elements, { value: "truthy" }).test).toBe(
        true
      );
      expect(calculateVisibility(elements, { value: "" }).test).toBe(false);
      expect(calculateVisibility(elements, { value: 0 }).test).toBe(false);
      expect(calculateVisibility(elements, { value: 1 }).test).toBe(true);
    });
  });
});

describe("getUpdatedVisibility", () => {
  it("should return prev when both are empty", () => {
    const prev = {};
    const next = {};

    const result = getUpdatedVisibility(prev, next);

    expect(result).toBe(prev);
  });

  it("should return prev when values are identical", () => {
    const prev = { field1: true, field2: false };
    const next = { field1: true, field2: false };

    const result = getUpdatedVisibility(prev, next);

    expect(result).toBe(prev);
  });

  it("should return next when a value changed", () => {
    const prev = { field1: true, field2: false };
    const next = { field1: true, field2: true };

    const result = getUpdatedVisibility(prev, next);

    expect(result).toBe(next);
  });

  it("should return next when new key is added", () => {
    const prev = { field1: true };
    const next = { field1: true, field2: false };

    const result = getUpdatedVisibility(prev, next);

    expect(result).toBe(next);
  });

  it("should return next when key is removed", () => {
    const prev = { field1: true, field2: false };
    const next = { field1: true };

    const result = getUpdatedVisibility(prev, next);

    expect(result).toBe(next);
  });

  it("should preserve reference equality when no change (React optimization)", () => {
    const prev = { a: true, b: false, c: true };
    const next = { a: true, b: false, c: true };

    const result1 = getUpdatedVisibility(prev, next);
    const result2 = getUpdatedVisibility(result1, next);

    expect(result1).toBe(prev);
    expect(result2).toBe(prev);
  });
});
