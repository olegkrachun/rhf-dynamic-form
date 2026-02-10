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
          children: [
            {
              type: "container",
              variant: "column",
              meta: { width: "50%" },
              children: [
                { type: "text", name: "firstName", defaultValue: "John" },
              ],
            },
            {
              type: "container",
              variant: "column",
              meta: { width: "50%" },
              children: [
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
          children: [
            {
              type: "container",
              variant: "column",
              meta: { width: "100%" },
              children: [],
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

  describe("deep cloning for frozen Redux state", () => {
    it("should deep clone arrays from initialData", () => {
      const config: FormConfiguration = {
        elements: [{ type: "array", name: "items", itemFields: [] }],
      };
      const originalArray = [{ id: "1", name: "Item 1" }];
      const initialData = { items: originalArray };

      const result = mergeDefaults(config, initialData);

      // Should be equal in value
      expect(result.items).toEqual(originalArray);
      // But not the same reference
      expect(result.items).not.toBe(originalArray);
      // Nested objects should also be cloned
      expect((result.items as unknown[])[0]).not.toBe(originalArray[0]);
    });

    it("should handle frozen arrays (simulating Redux state)", () => {
      const config: FormConfiguration = {
        elements: [{ type: "array", name: "members", itemFields: [] }],
      };
      const frozenArray = Object.freeze([
        Object.freeze({ id: "1", name: "Member 1" }),
        Object.freeze({ id: "2", name: "Member 2" }),
      ]);
      const initialData = { members: frozenArray };

      const result = mergeDefaults(config, initialData);

      // Should be able to modify the cloned array
      const members = result.members as { id: string; name: string }[];
      expect(() => {
        members.push({ id: "3", name: "Member 3" });
      }).not.toThrow();
      expect(members).toHaveLength(3);
    });

    it("should deep clone nested objects within arrays", () => {
      const config: FormConfiguration = {
        elements: [{ type: "array", name: "parties", itemFields: [] }],
      };
      const initialData = {
        parties: [{ id: "1", contact: { email: "a@b.com", phone: "123" } }],
      };

      const result = mergeDefaults(config, initialData);

      // Nested contact object should be a new reference
      const parties = result.parties as {
        id: string;
        contact: { email: string; phone: string };
      }[];
      expect(parties[0].contact).toEqual(initialData.parties[0].contact);
      expect(parties[0].contact).not.toBe(initialData.parties[0].contact);
    });

    it("should handle empty arrays", () => {
      const config: FormConfiguration = {
        elements: [{ type: "array", name: "items", itemFields: [] }],
      };
      const initialData = { items: [] };

      const result = mergeDefaults(config, initialData);

      expect(result.items).toEqual([]);
      expect(result.items).not.toBe(initialData.items);
    });

    it("should handle arrays with primitive values", () => {
      const config: FormConfiguration = {
        elements: [{ type: "array", name: "tags", itemFields: [] }],
      };
      const originalTags = ["tag1", "tag2", "tag3"];
      const initialData = { tags: originalTags };

      const result = mergeDefaults(config, initialData);

      expect(result.tags).toEqual(originalTags);
      expect(result.tags).not.toBe(originalTags);
    });

    it("should handle deeply nested frozen state", () => {
      const config: FormConfiguration = {
        elements: [{ type: "text", name: "form.section.field" }],
      };
      const deeplyFrozen = Object.freeze({
        form: Object.freeze({
          section: Object.freeze({
            field: "value",
            items: Object.freeze([Object.freeze({ id: "1" })]),
          }),
        }),
      });

      const result = mergeDefaults(config, deeplyFrozen);

      // Should be able to access values
      expect(result).toHaveProperty("form.section.field", "value");
    });
  });
});
