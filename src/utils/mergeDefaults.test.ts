import { describe, expect, it } from "vitest";
import type { FormConfiguration } from "../types";
import { getNestedValue, mergeDefaults, setNestedValue } from "./mergeDefaults";

describe("setNestedValue", () => {
  it("should set value at single level", () => {
    const obj: Record<string, unknown> = {};

    setNestedValue(obj, "name", "John");

    expect(obj.name).toBe("John");
  });

  it("should set value at multiple levels", () => {
    const obj: Record<string, unknown> = {};

    setNestedValue(obj, "source.contact.email", "test@example.com");

    expect(obj).toEqual({
      source: {
        contact: {
          email: "test@example.com",
        },
      },
    });
  });

  it("should create intermediate objects as needed", () => {
    const obj: Record<string, unknown> = {};

    setNestedValue(obj, "a.b.c.d", "deep");

    expect(obj).toEqual({
      a: {
        b: {
          c: {
            d: "deep",
          },
        },
      },
    });
  });

  it("should overwrite existing values", () => {
    const obj: Record<string, unknown> = { name: "old" };

    setNestedValue(obj, "name", "new");

    expect(obj.name).toBe("new");
  });

  it("should preserve existing sibling properties", () => {
    const obj: Record<string, unknown> = {
      source: {
        existingProp: "keep",
      },
    };

    setNestedValue(obj, "source.newProp", "added");

    expect(obj).toEqual({
      source: {
        existingProp: "keep",
        newProp: "added",
      },
    });
  });
});

describe("getNestedValue", () => {
  it("should get value at single level", () => {
    const obj = { name: "John" };

    const result = getNestedValue(obj, "name");

    expect(result).toBe("John");
  });

  it("should get value at multiple levels", () => {
    const obj = {
      source: {
        contact: {
          email: "test@example.com",
        },
      },
    };

    const result = getNestedValue(obj, "source.contact.email");

    expect(result).toBe("test@example.com");
  });

  it("should return undefined for missing path", () => {
    const obj = { name: "John" };

    const result = getNestedValue(obj, "missing.path");

    expect(result).toBeUndefined();
  });

  it("should return undefined for partially missing path", () => {
    const obj = {
      source: {
        name: "test",
      },
    };

    const result = getNestedValue(obj, "source.contact.email");

    expect(result).toBeUndefined();
  });

  it("should handle null values in path", () => {
    const obj = {
      source: null,
    };

    const result = getNestedValue(obj, "source.name");

    expect(result).toBeUndefined();
  });

  it("should return nested object if path points to it", () => {
    const obj = {
      source: {
        nested: { value: 123 },
      },
    };

    const result = getNestedValue(obj, "source.nested");

    expect(result).toEqual({ value: 123 });
  });
});

describe("mergeDefaults", () => {
  it("should use config defaultValue", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "text",
          name: "firstName",
          defaultValue: "Default Name",
        },
      ],
    };

    const result = mergeDefaults(config);

    expect(result.firstName).toBe("Default Name");
  });

  it("should allow initialData to override defaultValue", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "text",
          name: "firstName",
          defaultValue: "Default Name",
        },
      ],
    };
    const initialData = { firstName: "Provided Name" };

    const result = mergeDefaults(config, initialData);

    expect(result.firstName).toBe("Provided Name");
  });

  it("should use type defaults when no defaultValue specified", () => {
    const config: FormConfiguration = {
      elements: [
        { type: "boolean", name: "isActive" },
        { type: "text", name: "name" },
        { type: "email", name: "email" },
      ],
    };

    const result = mergeDefaults(config);

    expect(result.isActive).toBe(false); // Boolean default
    expect(result.name).toBe(""); // String default
    expect(result.email).toBe(""); // String default
  });

  it("should handle nested paths", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "text",
          name: "source.firstName",
          defaultValue: "John",
        },
        {
          type: "text",
          name: "source.lastName",
          defaultValue: "Doe",
        },
      ],
    };

    const result = mergeDefaults(config);

    expect(result).toEqual({
      source: {
        firstName: "John",
        lastName: "Doe",
      },
    });
  });

  it("should deep merge initialData with defaults", () => {
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "contact.firstName", defaultValue: "Default" },
        { type: "text", name: "contact.lastName", defaultValue: "User" },
      ],
    };
    const initialData = {
      contact: {
        firstName: "Provided",
        // lastName not provided, should use default
      },
    };

    const result = mergeDefaults(config, initialData);

    expect(result).toEqual({
      contact: {
        firstName: "Provided",
        lastName: "User",
      },
    });
  });

  it("should handle fields in containers", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "50%",
              elements: [
                { type: "text", name: "firstName", defaultValue: "John" },
              ],
            },
            {
              type: "column",
              width: "50%",
              elements: [
                { type: "text", name: "lastName", defaultValue: "Doe" },
              ],
            },
          ],
        },
      ],
    };

    const result = mergeDefaults(config);

    expect(result).toEqual({
      firstName: "John",
      lastName: "Doe",
    });
  });

  it("should return empty object for config with no fields", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "100%",
              elements: [],
            },
          ],
        },
      ],
    };

    const result = mergeDefaults(config);

    expect(result).toEqual({});
  });

  it("should handle mixed field types with different defaults", () => {
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "text" },
        { type: "email", name: "email" },
        { type: "phone", name: "phone" },
        { type: "date", name: "date" },
        { type: "boolean", name: "boolean" },
      ],
    };

    const result = mergeDefaults(config);

    expect(result).toEqual({
      text: "",
      email: "",
      phone: "",
      date: "",
      boolean: false,
    });
  });
});
