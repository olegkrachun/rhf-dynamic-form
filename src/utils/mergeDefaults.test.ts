import { describe, expect, it } from "vitest";
import type { FormConfiguration, FormData } from "../types";
import { getNestedValue, mergeDefaults, setNestedValue } from "./mergeDefaults";

describe("setNestedValue", () => {
  it("should set simple property", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "name", "John");

    expect(obj.name).toBe("John");
  });

  it("should create nested structure for dot notation", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "source.name", "John");

    expect(obj).toEqual({ source: { name: "John" } });
  });

  it("should create deeply nested structure", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "a.b.c.d", "value");

    expect(obj).toEqual({ a: { b: { c: { d: "value" } } } });
  });

  it("should set multiple properties in same nested object", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "source.name", "John");
    setNestedValue(obj, "source.email", "john@example.com");

    expect(obj).toEqual({
      source: {
        name: "John",
        email: "john@example.com",
      },
    });
  });

  it("should override non-object value with object", () => {
    const obj: Record<string, unknown> = { source: "not an object" };
    setNestedValue(obj, "source.name", "John");

    expect(obj).toEqual({ source: { name: "John" } });
  });

  it("should override null value with object", () => {
    const obj: Record<string, unknown> = { source: null };
    setNestedValue(obj, "source.name", "John");

    expect(obj).toEqual({ source: { name: "John" } });
  });

  it("should handle setting boolean values", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "active", true);

    expect(obj.active).toBe(true);
  });

  it("should handle setting null values", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "value", null);

    expect(obj.value).toBeNull();
  });
});

describe("getNestedValue", () => {
  it("should get simple property", () => {
    const obj = { name: "John" };
    const result = getNestedValue(obj, "name");

    expect(result).toBe("John");
  });

  it("should get nested property", () => {
    const obj = { source: { name: "John" } };
    const result = getNestedValue(obj, "source.name");

    expect(result).toBe("John");
  });

  it("should get deeply nested property", () => {
    const obj = { a: { b: { c: { d: "value" } } } };
    const result = getNestedValue(obj, "a.b.c.d");

    expect(result).toBe("value");
  });

  it("should return undefined for non-existent simple property", () => {
    const obj = { name: "John" };
    const result = getNestedValue(obj, "email");

    expect(result).toBeUndefined();
  });

  it("should return undefined for non-existent nested property", () => {
    const obj = { source: { name: "John" } };
    const result = getNestedValue(obj, "source.email");

    expect(result).toBeUndefined();
  });

  it("should return undefined when path traverses null", () => {
    const obj = { source: null };
    const result = getNestedValue(obj, "source.name");

    expect(result).toBeUndefined();
  });

  it("should return undefined when path traverses undefined", () => {
    const obj = { source: undefined };
    const result = getNestedValue(obj, "source.name");

    expect(result).toBeUndefined();
  });

  it("should return undefined when path traverses non-object", () => {
    const obj = { source: "string" };
    const result = getNestedValue(obj, "source.name");

    expect(result).toBeUndefined();
  });

  it("should handle getting boolean values", () => {
    const obj = { active: true };
    const result = getNestedValue(obj, "active");

    expect(result).toBe(true);
  });

  it("should handle getting null values", () => {
    const obj = { value: null };
    const result = getNestedValue(obj, "value");

    expect(result).toBeNull();
  });
});

describe("mergeDefaults", () => {
  describe("with type defaults", () => {
    it("should set empty string for text fields", () => {
      const config: FormConfiguration = {
        elements: [{ type: "text", name: "name" }],
      };

      const result = mergeDefaults(config);

      expect(result).toEqual({ name: "" });
    });

    it("should set empty string for email fields", () => {
      const config: FormConfiguration = {
        elements: [{ type: "email", name: "email" }],
      };

      const result = mergeDefaults(config);

      expect(result).toEqual({ email: "" });
    });

    it("should set empty string for phone fields", () => {
      const config: FormConfiguration = {
        elements: [{ type: "phone", name: "phone" }],
      };

      const result = mergeDefaults(config);

      expect(result).toEqual({ phone: "" });
    });

    it("should set empty string for date fields", () => {
      const config: FormConfiguration = {
        elements: [{ type: "date", name: "birthDate" }],
      };

      const result = mergeDefaults(config);

      expect(result).toEqual({ birthDate: "" });
    });

    it("should set false for boolean fields", () => {
      const config: FormConfiguration = {
        elements: [{ type: "boolean", name: "active" }],
      };

      const result = mergeDefaults(config);

      expect(result).toEqual({ active: false });
    });
  });

  describe("with config defaultValue", () => {
    it("should use defaultValue from config", () => {
      const config: FormConfiguration = {
        elements: [
          { type: "text", name: "name", defaultValue: "Default Name" },
        ],
      };

      const result = mergeDefaults(config);

      expect(result).toEqual({ name: "Default Name" });
    });

    it("should prefer defaultValue over type default", () => {
      const config: FormConfiguration = {
        elements: [{ type: "boolean", name: "active", defaultValue: true }],
      };

      const result = mergeDefaults(config);

      expect(result).toEqual({ active: true });
    });

    it("should handle defaultValue with nested paths", () => {
      const config: FormConfiguration = {
        elements: [
          {
            type: "text",
            name: "source.name",
            defaultValue: "Default Name",
          },
        ],
      };

      const result = mergeDefaults(config);

      expect(result).toEqual({
        source: { name: "Default Name" },
      });
    });
  });

  describe("with initialData", () => {
    it("should merge simple initialData", () => {
      const config: FormConfiguration = {
        elements: [{ type: "text", name: "name" }],
      };
      const initialData: FormData = { name: "Provided Name" };

      const result = mergeDefaults(config, initialData);

      expect(result).toEqual({ name: "Provided Name" });
    });

    it("should prefer initialData over config defaultValue", () => {
      const config: FormConfiguration = {
        elements: [
          { type: "text", name: "name", defaultValue: "Default Name" },
        ],
      };
      const initialData: FormData = { name: "Provided Name" };

      const result = mergeDefaults(config, initialData);

      expect(result).toEqual({ name: "Provided Name" });
    });

    it("should merge nested initialData", () => {
      const config: FormConfiguration = {
        elements: [
          { type: "text", name: "source.name" },
          { type: "email", name: "source.email" },
        ],
      };
      const initialData: FormData = {
        source: { name: "Provided Name" },
      };

      const result = mergeDefaults(config, initialData);

      expect(result).toEqual({
        source: {
          name: "Provided Name",
          email: "",
        },
      });
    });

    it("should merge partial initialData with defaults", () => {
      const config: FormConfiguration = {
        elements: [
          { type: "text", name: "name", defaultValue: "Default Name" },
          { type: "email", name: "email" },
          { type: "boolean", name: "active" },
        ],
      };
      const initialData: FormData = { email: "provided@example.com" };

      const result = mergeDefaults(config, initialData);

      expect(result).toEqual({
        name: "Default Name",
        email: "provided@example.com",
        active: false,
      });
    });

    it("should handle deeply nested initialData", () => {
      const config: FormConfiguration = {
        elements: [
          { type: "text", name: "a.b.c" },
          { type: "text", name: "a.b.d" },
        ],
      };
      const initialData: FormData = {
        a: { b: { c: "provided" } },
      };

      const result = mergeDefaults(config, initialData);

      expect(result).toEqual({
        a: {
          b: {
            c: "provided",
            d: "",
          },
        },
      });
    });
  });

  describe("with multiple fields", () => {
    it("should merge defaults for all field types", () => {
      const config: FormConfiguration = {
        elements: [
          { type: "text", name: "name" },
          { type: "email", name: "email" },
          { type: "boolean", name: "active" },
          { type: "phone", name: "phone" },
          { type: "date", name: "birthDate" },
        ],
      };

      const result = mergeDefaults(config);

      expect(result).toEqual({
        name: "",
        email: "",
        active: false,
        phone: "",
        birthDate: "",
      });
    });

    it("should handle fields from containers", () => {
      const config: FormConfiguration = {
        elements: [
          { type: "text", name: "title" },
          {
            type: "container",
            columns: [
              {
                type: "column",
                width: "50%",
                elements: [{ type: "text", name: "firstName" }],
              },
              {
                type: "column",
                width: "50%",
                elements: [{ type: "text", name: "lastName" }],
              },
            ],
          },
        ],
      };

      const result = mergeDefaults(config);

      expect(result).toEqual({
        title: "",
        firstName: "",
        lastName: "",
      });
    });

    it("should handle nested field paths across multiple fields", () => {
      const config: FormConfiguration = {
        elements: [
          { type: "text", name: "source.name" },
          { type: "email", name: "source.email" },
          { type: "boolean", name: "source.active" },
        ],
      };

      const result = mergeDefaults(config);

      expect(result).toEqual({
        source: {
          name: "",
          email: "",
          active: false,
        },
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty elements array", () => {
      const config: FormConfiguration = {
        elements: [],
      };

      const result = mergeDefaults(config);

      expect(result).toEqual({});
    });

    it("should not modify config or initialData", () => {
      const config: FormConfiguration = {
        elements: [{ type: "text", name: "name" }],
      };
      const initialData: FormData = { name: "Original" };

      mergeDefaults(config, initialData);

      expect(initialData.name).toBe("Original");
    });

    it("should use type default when defaultValue is null", () => {
      // Arrange
      const config: FormConfiguration = {
        elements: [{ type: "text", name: "name", defaultValue: null }],
      };
      const expectedResult = { name: "" }; // null is treated as absent, uses type default

      // Act
      const result = mergeDefaults(config);

      // Assert - null defaultValue falls back to type default
      expect(result).toEqual(expectedResult);
    });

    it("should deep merge nested objects", () => {
      const config: FormConfiguration = {
        elements: [
          { type: "text", name: "user.name" },
          { type: "email", name: "user.email" },
          { type: "text", name: "user.address.city" },
        ],
      };
      const initialData: FormData = {
        user: {
          name: "John",
          address: { city: "New York" },
        },
      };

      const result = mergeDefaults(config, initialData);

      expect(result).toEqual({
        user: {
          name: "John",
          email: "",
          address: { city: "New York" },
        },
      });
    });
  });
});
