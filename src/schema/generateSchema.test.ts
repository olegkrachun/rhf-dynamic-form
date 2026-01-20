import { describe, expect, it } from "vitest";
import type { FormConfiguration } from "../types";
import { generateZodSchema } from "./generateSchema";

describe("generateZodSchema", () => {
  it("should generate schema for simple text field", () => {
    const config: FormConfiguration = {
      elements: [{ type: "text", name: "name" }],
    };

    const schema = generateZodSchema(config);
    const result = schema.safeParse({ name: "John" });

    expect(result.success).toBe(true);
  });

  it("should generate schema for nested field paths", () => {
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "source.name" },
        { type: "email", name: "source.email" },
      ],
    };

    const schema = generateZodSchema(config);
    const result = schema.safeParse({
      source: {
        name: "John",
        email: "john@example.com",
      },
    });

    expect(result.success).toBe(true);
  });

  it("should validate required fields", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "text",
          name: "name",
          validation: { required: true },
        },
      ],
    };

    const schema = generateZodSchema(config);

    // Empty string should fail
    const failResult = schema.safeParse({ name: "" });
    expect(failResult.success).toBe(false);

    // Non-empty string should pass
    const passResult = schema.safeParse({ name: "John" });
    expect(passResult.success).toBe(true);
  });

  it("should validate minLength", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "text",
          name: "name",
          validation: { minLength: 3 },
        },
      ],
    };

    const schema = generateZodSchema(config);

    // Too short should fail
    const failResult = schema.safeParse({ name: "Jo" });
    expect(failResult.success).toBe(false);

    // Long enough should pass
    const passResult = schema.safeParse({ name: "John" });
    expect(passResult.success).toBe(true);
  });

  it("should validate maxLength", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "text",
          name: "name",
          validation: { maxLength: 5 },
        },
      ],
    };

    const schema = generateZodSchema(config);

    // Too long should fail
    const failResult = schema.safeParse({ name: "Jonathan" });
    expect(failResult.success).toBe(false);

    // Short enough should pass
    const passResult = schema.safeParse({ name: "John" });
    expect(passResult.success).toBe(true);
  });

  it("should validate pattern", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "text",
          name: "code",
          validation: { pattern: "^[A-Z]{3}$" },
        },
      ],
    };

    const schema = generateZodSchema(config);

    // Non-matching should fail
    const failResult = schema.safeParse({ code: "abc" });
    expect(failResult.success).toBe(false);

    // Matching should pass
    const passResult = schema.safeParse({ code: "ABC" });
    expect(passResult.success).toBe(true);
  });

  it("should validate email fields", () => {
    const config: FormConfiguration = {
      elements: [{ type: "email", name: "email" }],
    };

    const schema = generateZodSchema(config);

    // Invalid email should fail
    const failResult = schema.safeParse({ email: "notanemail" });
    expect(failResult.success).toBe(false);

    // Valid email should pass
    const passResult = schema.safeParse({ email: "test@example.com" });
    expect(passResult.success).toBe(true);
  });

  it("should generate schema for boolean fields", () => {
    const config: FormConfiguration = {
      elements: [{ type: "boolean", name: "active" }],
    };

    const schema = generateZodSchema(config);

    // Boolean should pass
    const result = schema.safeParse({ active: true });
    expect(result.success).toBe(true);

    // String should fail (strict typing)
    const failResult = schema.safeParse({ active: "true" });
    expect(failResult.success).toBe(false);
  });

  it("should handle required boolean (must be true)", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "boolean",
          name: "acceptTerms",
          validation: { required: true },
        },
      ],
    };

    const schema = generateZodSchema(config);

    // false should fail for required boolean
    const failResult = schema.safeParse({ acceptTerms: false });
    expect(failResult.success).toBe(false);

    // true should pass
    const passResult = schema.safeParse({ acceptTerms: true });
    expect(passResult.success).toBe(true);
  });

  it("should generate schema for all field types together", () => {
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "source.name" },
        { type: "email", name: "source.email" },
        { type: "phone", name: "source.phone" },
        { type: "boolean", name: "source.active" },
        { type: "date", name: "source.birthDate" },
      ],
    };

    const schema = generateZodSchema(config);
    const result = schema.safeParse({
      source: {
        name: "John",
        email: "john@example.com",
        phone: "1234567890",
        active: true,
        birthDate: "1990-01-01",
      },
    });

    expect(result.success).toBe(true);
  });

  describe("select field schema", () => {
    it("should generate schema for single select field", () => {
      const config: FormConfiguration = {
        elements: [
          {
            type: "select",
            name: "country",
            options: [
              { value: "us", label: "United States" },
              { value: "ca", label: "Canada" },
            ],
          },
        ],
      };

      const schema = generateZodSchema(config);

      // String value should pass
      expect(schema.safeParse({ country: "us" }).success).toBe(true);
      // Number value should pass
      expect(schema.safeParse({ country: 123 }).success).toBe(true);
      // Null should pass (clearable)
      expect(schema.safeParse({ country: null }).success).toBe(true);
    });

    it("should generate schema for multi-select field", () => {
      const config: FormConfiguration = {
        elements: [
          {
            type: "select",
            name: "tags",
            options: [
              { value: "tag1", label: "Tag 1" },
              { value: "tag2", label: "Tag 2" },
            ],
            multiple: true,
          },
        ],
      };

      const schema = generateZodSchema(config);

      // Array of strings should pass
      expect(schema.safeParse({ tags: ["tag1", "tag2"] }).success).toBe(true);
      // Empty array should pass
      expect(schema.safeParse({ tags: [] }).success).toBe(true);
      // Non-array should fail
      expect(schema.safeParse({ tags: "tag1" }).success).toBe(false);
    });

    it("should validate required single select", () => {
      const config: FormConfiguration = {
        elements: [
          {
            type: "select",
            name: "status",
            options: [{ value: "active", label: "Active" }],
            validation: { required: true },
          },
        ],
      };

      const schema = generateZodSchema(config);

      // Value should pass
      expect(schema.safeParse({ status: "active" }).success).toBe(true);
      // Null should fail
      expect(schema.safeParse({ status: null }).success).toBe(false);
    });

    it("should validate required multi-select", () => {
      const config: FormConfiguration = {
        elements: [
          {
            type: "select",
            name: "categories",
            options: [{ value: "cat1", label: "Category 1" }],
            multiple: true,
            validation: { required: true },
          },
        ],
      };

      const schema = generateZodSchema(config);

      // Non-empty array should pass
      expect(schema.safeParse({ categories: ["cat1"] }).success).toBe(true);
      // Empty array should fail
      expect(schema.safeParse({ categories: [] }).success).toBe(false);
    });
  });

  describe("array field schema", () => {
    it("should generate schema for array field with itemFields", () => {
      const config: FormConfiguration = {
        elements: [
          {
            type: "array",
            name: "contacts",
            itemFields: [
              { type: "text", name: "name" },
              { type: "email", name: "email" },
            ],
          },
        ],
      };

      const schema = generateZodSchema(config);

      const validData = {
        contacts: [
          { name: "John", email: "john@example.com" },
          { name: "Jane", email: "jane@example.com" },
        ],
      };
      expect(schema.safeParse(validData).success).toBe(true);

      // Empty array should pass
      expect(schema.safeParse({ contacts: [] }).success).toBe(true);
    });

    it("should validate minItems on array field", () => {
      const config: FormConfiguration = {
        elements: [
          {
            type: "array",
            name: "items",
            itemFields: [{ type: "text", name: "value" }],
            minItems: 2,
          },
        ],
      };

      const schema = generateZodSchema(config);

      // Too few items should fail
      expect(schema.safeParse({ items: [{ value: "one" }] }).success).toBe(
        false
      );
      // Exactly minItems should pass
      expect(
        schema.safeParse({ items: [{ value: "one" }, { value: "two" }] })
          .success
      ).toBe(true);
    });

    it("should validate maxItems on array field", () => {
      const config: FormConfiguration = {
        elements: [
          {
            type: "array",
            name: "items",
            itemFields: [{ type: "text", name: "value" }],
            maxItems: 2,
          },
        ],
      };

      const schema = generateZodSchema(config);

      // Within limit should pass
      expect(
        schema.safeParse({ items: [{ value: "one" }, { value: "two" }] })
          .success
      ).toBe(true);
      // Exceeding limit should fail
      expect(
        schema.safeParse({
          items: [{ value: "one" }, { value: "two" }, { value: "three" }],
        }).success
      ).toBe(false);
    });

    it("should validate itemFields recursively", () => {
      const config: FormConfiguration = {
        elements: [
          {
            type: "array",
            name: "contacts",
            itemFields: [
              { type: "text", name: "name", validation: { required: true } },
              { type: "email", name: "email" },
            ],
          },
        ],
      };

      const schema = generateZodSchema(config);

      // Invalid email in item should fail
      const invalidEmail = {
        contacts: [{ name: "John", email: "not-an-email" }],
      };
      expect(schema.safeParse(invalidEmail).success).toBe(false);

      // Empty required field should fail
      const emptyRequired = {
        contacts: [{ name: "", email: "john@example.com" }],
      };
      expect(schema.safeParse(emptyRequired).success).toBe(false);
    });

    it("should handle nested array fields in containers", () => {
      const config: FormConfiguration = {
        elements: [
          {
            type: "container",
            columns: [
              {
                type: "column",
                width: "100%",
                elements: [
                  {
                    type: "array",
                    name: "nested.contacts",
                    itemFields: [{ type: "text", name: "name" }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const schema = generateZodSchema(config);

      const validData = {
        nested: {
          contacts: [{ name: "John" }, { name: "Jane" }],
        },
      };
      expect(schema.safeParse(validData).success).toBe(true);
    });
  });
});
