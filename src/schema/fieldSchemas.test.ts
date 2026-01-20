import { describe, expect, it } from "vitest";
import type {
  ArrayFieldElement,
  BooleanFieldElement,
  CustomFieldElement,
  DateFieldElement,
  EmailFieldElement,
  PhoneFieldElement,
  SelectFieldElement,
  TextFieldElement,
} from "../types";
import { buildFieldSchema, isFieldOptional } from "./fieldSchemas";

describe("fieldSchemas", () => {
  describe("buildFieldSchema - basic types", () => {
    it("should build schema for text field", () => {
      const field: TextFieldElement = {
        type: "text",
        name: "firstName",
      };

      const schema = buildFieldSchema(field);
      const result = schema.safeParse("John");

      expect(result.success).toBe(true);
    });

    it("should build schema for email field with email validation", () => {
      const field: EmailFieldElement = {
        type: "email",
        name: "contactEmail",
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("test@example.com").success).toBe(true);
      expect(schema.safeParse("invalid-email").success).toBe(false);
    });

    it("should build schema for boolean field", () => {
      const field: BooleanFieldElement = {
        type: "boolean",
        name: "isActive",
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse(false).success).toBe(true);
      expect(schema.safeParse("true").success).toBe(false);
    });

    it("should build schema for phone field", () => {
      const field: PhoneFieldElement = {
        type: "phone",
        name: "mobile",
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("+1234567890").success).toBe(true);
      expect(schema.safeParse(123).success).toBe(false);
    });

    it("should build schema for date field", () => {
      const field: DateFieldElement = {
        type: "date",
        name: "birthDate",
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("2024-01-15").success).toBe(true);
      expect(schema.safeParse("").success).toBe(true); // Empty string is valid
    });

    it("should build schema for custom field (accepts any value)", () => {
      const field: CustomFieldElement = {
        type: "custom",
        name: "customWidget",
        component: "MyWidget",
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("anything").success).toBe(true);
      expect(schema.safeParse(123).success).toBe(true);
      expect(schema.safeParse({ complex: "object" }).success).toBe(true);
      expect(schema.safeParse(null).success).toBe(true);
    });
  });

  describe("buildFieldSchema - select field", () => {
    it("should build schema for single select field", () => {
      const field: SelectFieldElement = {
        type: "select",
        name: "country",
        options: [
          { value: "us", label: "United States" },
          { value: "ca", label: "Canada" },
        ],
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("us").success).toBe(true);
      expect(schema.safeParse(123).success).toBe(true); // Numbers allowed
      expect(schema.safeParse(null).success).toBe(true); // Null allowed (clearable)
    });

    it("should build schema for multi-select field", () => {
      const field: SelectFieldElement = {
        type: "select",
        name: "tags",
        options: [
          { value: "tag1", label: "Tag 1" },
          { value: "tag2", label: "Tag 2" },
        ],
        multiple: true,
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse(["tag1", "tag2"]).success).toBe(true);
      expect(schema.safeParse([]).success).toBe(true);
      expect(schema.safeParse([1, 2, 3]).success).toBe(true); // Numbers allowed
      expect(schema.safeParse("tag1").success).toBe(false); // Must be array
    });
  });

  describe("buildFieldSchema - array field", () => {
    it("should build schema for array field with itemFields", () => {
      const field: ArrayFieldElement = {
        type: "array",
        name: "contacts",
        itemFields: [
          { type: "text", name: "name" },
          { type: "email", name: "email" },
        ],
      };

      const schema = buildFieldSchema(field);

      const validData = [
        { name: "John", email: "john@example.com" },
        { name: "Jane", email: "jane@example.com" },
      ];
      expect(schema.safeParse(validData).success).toBe(true);
      expect(schema.safeParse([]).success).toBe(true);
    });

    it("should apply minItems constraint on array field", () => {
      const field: ArrayFieldElement = {
        type: "array",
        name: "contacts",
        itemFields: [{ type: "text", name: "name" }],
        minItems: 2,
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse([{ name: "One" }]).success).toBe(false);
      expect(schema.safeParse([{ name: "One" }, { name: "Two" }]).success).toBe(
        true
      );
    });

    it("should apply maxItems constraint on array field", () => {
      const field: ArrayFieldElement = {
        type: "array",
        name: "contacts",
        itemFields: [{ type: "text", name: "name" }],
        maxItems: 2,
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse([{ name: "One" }, { name: "Two" }]).success).toBe(
        true
      );
      expect(
        schema.safeParse([{ name: "One" }, { name: "Two" }, { name: "Three" }])
          .success
      ).toBe(false);
    });

    it("should validate nested itemFields recursively", () => {
      const field: ArrayFieldElement = {
        type: "array",
        name: "contacts",
        itemFields: [
          { type: "text", name: "name" },
          { type: "email", name: "email" },
        ],
      };

      const schema = buildFieldSchema(field);

      // Invalid email should fail
      const invalidData = [{ name: "John", email: "not-an-email" }];
      expect(schema.safeParse(invalidData).success).toBe(false);
    });
  });

  describe("applyStringValidation", () => {
    it("should apply required validation (min 1 character)", () => {
      const field: TextFieldElement = {
        type: "text",
        name: "name",
        validation: { required: true },
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("John").success).toBe(true);
      expect(schema.safeParse("").success).toBe(false);
    });

    it("should apply minLength validation", () => {
      const field: TextFieldElement = {
        type: "text",
        name: "username",
        validation: { minLength: 3 },
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("ab").success).toBe(false);
      expect(schema.safeParse("abc").success).toBe(true);
      expect(schema.safeParse("abcd").success).toBe(true);
    });

    it("should apply maxLength validation", () => {
      const field: TextFieldElement = {
        type: "text",
        name: "code",
        validation: { maxLength: 5 },
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("12345").success).toBe(true);
      expect(schema.safeParse("123456").success).toBe(false);
    });

    it("should apply pattern validation with regex", () => {
      const field: TextFieldElement = {
        type: "text",
        name: "zipCode",
        validation: { pattern: "^[0-9]{5}$", message: "Invalid zip code" },
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("12345").success).toBe(true);
      expect(schema.safeParse("1234").success).toBe(false);
      expect(schema.safeParse("abcde").success).toBe(false);
    });

    it("should combine multiple string validations", () => {
      const field: TextFieldElement = {
        type: "text",
        name: "code",
        validation: {
          required: true,
          minLength: 3,
          maxLength: 10,
          pattern: "^[A-Z]+$",
        },
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("").success).toBe(false); // Required
      expect(schema.safeParse("AB").success).toBe(false); // Too short
      expect(schema.safeParse("ABCDEFGHIJK").success).toBe(false); // Too long
      expect(schema.safeParse("abc").success).toBe(false); // Wrong pattern
      expect(schema.safeParse("ABC").success).toBe(true); // Valid
    });
  });

  describe("applyBooleanValidation", () => {
    it("should apply required validation (must be true)", () => {
      const field: BooleanFieldElement = {
        type: "boolean",
        name: "acceptTerms",
        validation: { required: true },
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse(false).success).toBe(false);
    });

    it("should allow false when not required", () => {
      const field: BooleanFieldElement = {
        type: "boolean",
        name: "optIn",
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse(false).success).toBe(true);
    });
  });

  describe("applySelectValidation", () => {
    it("should apply required validation for single select", () => {
      const field: SelectFieldElement = {
        type: "select",
        name: "status",
        options: [{ value: "active", label: "Active" }],
        validation: { required: true },
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("active").success).toBe(true);
      expect(schema.safeParse(null).success).toBe(false);
      expect(schema.safeParse(undefined).success).toBe(false);
    });

    it("should apply required validation for multi-select (at least one)", () => {
      const field: SelectFieldElement = {
        type: "select",
        name: "tags",
        options: [{ value: "tag1", label: "Tag 1" }],
        multiple: true,
        validation: { required: true },
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse(["tag1"]).success).toBe(true);
      expect(schema.safeParse([]).success).toBe(false);
    });
  });

  describe("isFieldOptional", () => {
    it("should return true when no validation config", () => {
      const field: TextFieldElement = {
        type: "text",
        name: "optional",
      };

      expect(isFieldOptional(field)).toBe(true);
    });

    it("should return true when required is false", () => {
      const field: TextFieldElement = {
        type: "text",
        name: "optional",
        validation: { required: false },
      };

      expect(isFieldOptional(field)).toBe(true);
    });

    it("should return false when required is true", () => {
      const field: TextFieldElement = {
        type: "text",
        name: "required",
        validation: { required: true },
      };

      expect(isFieldOptional(field)).toBe(false);
    });

    it("should return true when validation exists but required is not set", () => {
      const field: TextFieldElement = {
        type: "text",
        name: "hasValidation",
        validation: { minLength: 3 },
      };

      expect(isFieldOptional(field)).toBe(true);
    });
  });
});
