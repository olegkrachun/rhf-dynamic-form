import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { ArrayFieldElement, CustomFieldElement } from "../types/elements";
import { ConfigurationError } from "./ConfigurationError";
import type { CustomComponentRegistry } from "./types";
import {
  getValidatedCustomElements,
  validateCustomComponents,
} from "./validateConfiguration";

const MockComponent = () => null;
const AnotherMockComponent = () => null;

describe("validateCustomComponents", () => {
  const registry: CustomComponentRegistry = {
    RatingField: {
      component: MockComponent,
      propsSchema: z.object({ maxStars: z.number().default(5) }),
    },
    Other: AnotherMockComponent,
  };

  it("validates custom elements in flat config", () => {
    const config = {
      elements: [
        {
          type: "custom" as const,
          name: "rating",
          component: "RatingField",
          componentProps: { maxStars: 3 },
        },
        { type: "text" as const, name: "name", label: "Name" },
      ],
    };

    const result = validateCustomComponents(config, registry);

    const ratingElement = result.elements[0] as CustomFieldElement;
    expect(ratingElement.componentProps).toEqual({ maxStars: 3 });
  });

  it("validates custom elements in nested containers", () => {
    const config = {
      elements: [
        {
          type: "container" as const,
          children: [
            {
              type: "container" as const,
              variant: "column" as const,
              meta: { width: "100%" },
              children: [
                {
                  type: "custom" as const,
                  name: "nested.rating",
                  component: "RatingField",
                },
              ],
            },
          ],
        },
      ],
    };

    const result = validateCustomComponents(config, registry);

    const container = result.elements[0] as {
      children: Array<{ children: CustomFieldElement[] }>;
    };
    const ratingElement = container.children[0].children[0];
    expect(ratingElement.componentProps).toEqual({ maxStars: 5 });
  });

  it("passes through non-custom elements unchanged", () => {
    const config = {
      elements: [
        { type: "text" as const, name: "name", label: "Name" },
        { type: "email" as const, name: "email", label: "Email" },
      ],
    };

    const result = validateCustomComponents(config, registry);

    expect(result.elements).toEqual(config.elements);
  });

  it("validates custom elements in array item fields", () => {
    const config = {
      elements: [
        {
          type: "array" as const,
          name: "ratings",
          itemFields: [
            {
              type: "custom" as const,
              name: "rating",
              component: "RatingField",
            },
          ],
        },
      ],
    };

    const result = validateCustomComponents(config, registry);
    const arrayElement = result.elements[0] as ArrayFieldElement;
    const ratingElement = arrayElement.itemFields[0] as CustomFieldElement;

    expect(ratingElement.componentProps).toEqual({ maxStars: 5 });
  });

  it("throws for invalid custom component in nested structure", () => {
    const config = {
      elements: [
        {
          type: "container" as const,
          children: [
            {
              type: "container" as const,
              variant: "column" as const,
              meta: { width: "100%" },
              children: [
                {
                  type: "custom" as const,
                  name: "bad",
                  component: "NonExistent",
                },
              ],
            },
          ],
        },
      ],
    };

    expect(() => validateCustomComponents(config, registry)).toThrow(
      ConfigurationError
    );
    expect(() => validateCustomComponents(config, registry)).toThrow(
      expect.objectContaining({
        message: expect.stringContaining("NonExistent"),
      })
    );
  });

  it("works with empty registry", () => {
    const config = {
      elements: [{ type: "text" as const, name: "name", label: "Name" }],
    };

    const result = validateCustomComponents(config, {});

    expect(result.elements).toEqual(config.elements);
  });

  it("throws for missing custom component in array item fields by default", () => {
    const config = {
      elements: [
        {
          type: "array" as const,
          name: "ratings",
          itemFields: [
            {
              type: "custom" as const,
              name: "rating",
              component: "MissingRating",
            },
          ],
        },
      ],
    };

    expect(() => validateCustomComponents(config, registry)).toThrow(
      ConfigurationError
    );
    expect(() => validateCustomComponents(config, registry)).toThrow(
      expect.objectContaining({
        message: expect.stringContaining("MissingRating"),
      })
    );
  });

  it("allows missing custom component in array item fields when fallback is configured", () => {
    const config = {
      elements: [
        {
          type: "array" as const,
          name: "ratings",
          itemFields: [
            {
              type: "custom" as const,
              name: "rating",
              component: "MissingRating",
            },
          ],
        },
      ],
    };

    const result = validateCustomComponents(config, registry, {
      allowMissingCustomComponents: true,
    });
    const arrayElement = result.elements[0] as ArrayFieldElement;
    const ratingElement = arrayElement.itemFields[0] as CustomFieldElement;

    expect(ratingElement.component).toBe("MissingRating");
    expect(ratingElement.componentProps).toBeUndefined();
  });

  it("throws for invalid registered custom props in array item fields", () => {
    const config = {
      elements: [
        {
          type: "array" as const,
          name: "ratings",
          itemFields: [
            {
              type: "custom" as const,
              name: "rating",
              component: "RatingField",
              componentProps: { maxStars: "many" },
            },
          ],
        },
      ],
    };

    expect(() =>
      validateCustomComponents(config, registry, {
        allowMissingCustomComponents: true,
      })
    ).toThrow(ConfigurationError);
  });

  it("preserves config name property", () => {
    const config = {
      name: "TestForm",
      elements: [{ type: "text" as const, name: "field", label: "Field" }],
    };

    const result = validateCustomComponents(config, registry);

    expect(result.name).toBe("TestForm");
  });
});

describe("getValidatedCustomElements", () => {
  it("returns empty array for config with no custom elements", () => {
    const config = {
      elements: [
        { type: "text" as const, name: "name", label: "Name" },
        { type: "email" as const, name: "email", label: "Email" },
      ],
    };

    const result = getValidatedCustomElements(config);

    expect(result).toEqual([]);
  });

  it("collects flat custom elements", () => {
    const config = {
      elements: [
        {
          type: "custom" as const,
          name: "rating1",
          component: "RatingField",
          componentProps: { maxStars: 5 },
        },
        { type: "text" as const, name: "name", label: "Name" },
        {
          type: "custom" as const,
          name: "rating2",
          component: "Other",
          componentProps: {},
        },
      ],
    };

    const result = getValidatedCustomElements(config);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("rating1");
    expect(result[1].name).toBe("rating2");
  });

  it("collects custom elements from array item fields", () => {
    const config = {
      elements: [
        {
          type: "array" as const,
          name: "ratings",
          itemFields: [
            {
              type: "custom" as const,
              name: "rating",
              component: "RatingField",
              componentProps: {},
            },
          ],
        },
      ],
    };

    const result = getValidatedCustomElements(config);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("rating");
  });

  it("collects custom elements from nested containers", () => {
    const config = {
      elements: [
        {
          type: "container" as const,
          children: [
            {
              type: "container" as const,
              variant: "column" as const,
              meta: { width: "50%" },
              children: [
                {
                  type: "custom" as const,
                  name: "nested1",
                  component: "A",
                  componentProps: {},
                },
              ],
            },
            {
              type: "container" as const,
              variant: "column" as const,
              meta: { width: "50%" },
              children: [
                {
                  type: "custom" as const,
                  name: "nested2",
                  component: "B",
                  componentProps: {},
                },
              ],
            },
          ],
        },
      ],
    };

    const result = getValidatedCustomElements(config);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("nested1");
    expect(result[1].name).toBe("nested2");
  });

  it("collects from deeply nested structures", () => {
    const config = {
      elements: [
        {
          type: "container" as const,
          children: [
            {
              type: "container" as const,
              variant: "column" as const,
              meta: { width: "100%" },
              children: [
                {
                  type: "container" as const,
                  children: [
                    {
                      type: "container" as const,
                      variant: "column" as const,
                      meta: { width: "100%" },
                      children: [
                        {
                          type: "custom" as const,
                          name: "deep",
                          component: "X",
                          componentProps: {},
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = getValidatedCustomElements(config);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("deep");
  });
});
