import { describe, expect, it } from "vitest";
import type {
  ArrayFieldElement,
  BaseFieldElement,
  CustomFieldElement,
  SelectFieldElement,
} from "../types";
import { buildFieldSchema, isFieldOptional } from "./fieldSchemas";

describe("fieldSchemas", () => {
  describe("buildFieldSchema - basic types", () => {
    it("should build schema for text field", () => {
      const field: BaseFieldElement = {
        type: "text",
        name: "firstName",
      };

      const schema = buildFieldSchema(field);
      const result = schema.safeParse("John");

      expect(result.success).toBe(true);
    });

    it("should build schema for email field with email validation", () => {
      const field: BaseFieldElement = {
        type: "email",
        name: "contactEmail",
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("test@example.com").success).toBe(true);
      expect(schema.safeParse("invalid-email").success).toBe(false);
    });

    it("should defer to consumer's validation.pattern on email fields (skip the library default email check)", () => {
      // Consumer wants ONLY company emails — custom pattern overrides email default
      const field: BaseFieldElement = {
        type: "email",
        name: "workEmail",
        validation: {
          pattern: "^[\\w.+-]+@company\\.com$",
          message: "Must be a @company.com email",
        },
      };

      const schema = buildFieldSchema(field);

      // Strict consumer pattern passes
      expect(schema.safeParse("alice@company.com").success).toBe(true);

      // Email that's valid by the library default but not by consumer's pattern → fails
      const wrongDomainResult = schema.safeParse("alice@example.com");
      expect(wrongDomainResult.success).toBe(false);
      if (!wrongDomainResult.success) {
        expect(wrongDomainResult.error.issues[0].message).toBe(
          "Must be a @company.com email"
        );
      }
    });

    it("should build schema for boolean field", () => {
      const field: BaseFieldElement = {
        type: "boolean",
        name: "isActive",
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse(false).success).toBe(true);
      expect(schema.safeParse("true").success).toBe(false);
    });

    it("should build schema for phone field", () => {
      const field: BaseFieldElement = {
        type: "phone",
        name: "mobile",
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("+1234567890").success).toBe(true);
      expect(schema.safeParse(123).success).toBe(false);
    });

    it("should build schema for date field (format-agnostic — any string accepted)", () => {
      const field: BaseFieldElement = {
        type: "date",
        name: "birthDate",
      };

      const schema = buildFieldSchema(field);

      // Library is format-agnostic for dates — formatting/validation is a
      // component responsibility. Any string passes here.
      expect(schema.safeParse("2024-01-15").success).toBe(true);
      expect(schema.safeParse("01/15/2024").success).toBe(true);
      expect(schema.safeParse("").success).toBe(true);
    });

    it("should produce required-message for empty required date fields", () => {
      const field: BaseFieldElement = {
        type: "date",
        name: "birthDate",
        validation: { required: true },
      };

      const schema = buildFieldSchema(field);

      // Any non-empty string passes (format check is component-owned)
      expect(schema.safeParse("01/15/2024").success).toBe(true);

      // Empty / null / undefined produce required-message
      const emptyResult = schema.safeParse("");
      expect(emptyResult.success).toBe(false);
      if (!emptyResult.success) {
        expect(emptyResult.error.issues[0].message).toBe(
          "This field is required"
        );
      }
      expect(schema.safeParse(null).success).toBe(false);
      expect(schema.safeParse(undefined).success).toBe(false);
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

    it("should build row schemas for itemFields nested inside a container (unparsed config, defense-in-depth)", () => {
      // Containers inside itemFields are rejected by both the TS types and
      // parseConfiguration, but buildFieldSchema is reachable via the public
      // generateZodSchema export with an unparsed config — hence the cast.
      const field = {
        type: "array",
        name: "contacts",
        itemFields: [
          {
            type: "container",
            variant: "row",
            children: [
              { type: "text", name: "name" },
              { type: "email", name: "email" },
            ],
          },
        ],
      } as unknown as ArrayFieldElement;

      const schema = buildFieldSchema(field);

      expect(
        schema.safeParse([{ name: "John", email: "john@example.com" }]).success
      ).toBe(true);
      expect(
        schema.safeParse([{ name: "John", email: "not-an-email" }]).success
      ).toBe(false);
    });

    it("should use array schema even when field type matches schema map", () => {
      // Regression: field has type "text" (in schema map) but also has
      // itemFields — structural detection must win over schema map lookup
      const field = {
        type: "text",
        name: "parties",
        itemFields: [
          { type: "text", name: "name" },
          { type: "email", name: "email" },
        ],
      } as unknown as ArrayFieldElement;

      const schema = buildFieldSchema(field);

      // Must accept arrays (not strings)
      expect(
        schema.safeParse([{ name: "John", email: "j@e.com" }]).success
      ).toBe(true);
      expect(schema.safeParse("some string").success).toBe(false);
    });

    it("should enforce required validation on custom-typed itemFields (e.g. currency)", () => {
      // Regression: a custom-typed field (consumer-registered component like
      // "currency") falls through to z.unknown() in the base schema. Without
      // the uniform required-refine, `required: true` was silently ignored —
      // the reviewer could submit an empty row and the BE then rejected it.
      const field: ArrayFieldElement = {
        type: "array",
        name: "claims",
        itemFields: [
          {
            type: "custom",
            component: "currency",
            name: "ofBill.value",
            validation: { required: true },
          },
          {
            type: "custom",
            component: "currency",
            name: "claimed.value",
            validation: { required: true },
          },
        ],
      } as unknown as ArrayFieldElement;

      const schema = buildFieldSchema(field);

      // Row with both required values present must pass
      expect(
        schema.safeParse([{ ofBill: { value: 100 }, claimed: { value: 100 } }])
          .success
      ).toBe(true);

      // Row missing one required custom value must fail
      expect(
        schema.safeParse([{ ofBill: { value: 100 }, claimed: {} }]).success
      ).toBe(false);

      // Row with null required custom value must fail
      expect(
        schema.safeParse([{ ofBill: { value: 100 }, claimed: { value: null } }])
          .success
      ).toBe(false);
    });

    it("should expand dot-notation itemField names into nested object schemas", () => {
      // Regression: row data may be nested like { from: { value, confidence } }.
      // itemField name "from.value" must produce a nested schema that reads the
      // nested value, not a literal "from.value" key that never matches.
      const field: ArrayFieldElement = {
        type: "array",
        name: "claims",
        itemFields: [
          {
            type: "date",
            name: "from.value",
            validation: { required: true },
          },
          {
            type: "date",
            name: "to.value",
            validation: { required: true },
          },
        ],
      };

      const schema = buildFieldSchema(field);

      // Nested row data with the required values present must pass
      expect(
        schema.safeParse([
          {
            from: { value: "09/21/2021", confidence: 0.93 },
            to: { value: "09/23/2021", confidence: 0.99 },
          },
        ]).success
      ).toBe(true);

      // Missing nested value must fail with required check, not a type error
      expect(
        schema.safeParse([
          {
            from: { confidence: 0.93 },
            to: { value: "09/23/2021", confidence: 0.99 },
          },
        ]).success
      ).toBe(false);
    });
  });

  describe("applyStringValidation", () => {
    it("should apply required validation (min 1 character)", () => {
      const field: BaseFieldElement = {
        type: "text",
        name: "name",
        validation: { required: true },
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("John").success).toBe(true);
      expect(schema.safeParse("").success).toBe(false);
    });

    it("should apply minLength validation", () => {
      const field: BaseFieldElement = {
        type: "text",
        name: "username",
        validation: { minLength: 3 },
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("ab").success).toBe(false);
      expect(schema.safeParse("abc").success).toBe(true);
      expect(schema.safeParse("abcd").success).toBe(true);
    });

    it("should accept null and undefined but enforce minLength for optional field", () => {
      const field: BaseFieldElement = {
        type: "text",
        name: "nickname",
        validation: { minLength: 3 },
      };

      const schema = buildFieldSchema(field);

      // Optional field (no required:true) should accept null and undefined
      expect(schema.safeParse(null).success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);

      // But still reject strings shorter than minLength
      expect(schema.safeParse("ab").success).toBe(false);

      // And accept valid strings
      expect(schema.safeParse("abc").success).toBe(true);
    });

    it("should apply maxLength validation", () => {
      const field: BaseFieldElement = {
        type: "text",
        name: "code",
        validation: { maxLength: 5 },
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse("12345").success).toBe(true);
      expect(schema.safeParse("123456").success).toBe(false);
    });

    it("should apply pattern validation with regex", () => {
      const field: BaseFieldElement = {
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
      const field: BaseFieldElement = {
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
      const field: BaseFieldElement = {
        type: "boolean",
        name: "acceptTerms",
        validation: { required: true },
      };

      const schema = buildFieldSchema(field);

      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse(false).success).toBe(false);
    });

    it("should allow false when not required", () => {
      const field: BaseFieldElement = {
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
      const field: BaseFieldElement = {
        type: "text",
        name: "optional",
      };

      expect(isFieldOptional(field)).toBe(true);
    });

    it("should return true when required is false", () => {
      const field: BaseFieldElement = {
        type: "text",
        name: "optional",
        validation: { required: false },
      };

      expect(isFieldOptional(field)).toBe(true);
    });

    it("should return false when required is true", () => {
      const field: BaseFieldElement = {
        type: "text",
        name: "required",
        validation: { required: true },
      };

      expect(isFieldOptional(field)).toBe(false);
    });

    it("should return true when validation exists but required is not set", () => {
      const field: BaseFieldElement = {
        type: "text",
        name: "hasValidation",
        validation: { minLength: 3 },
      };

      expect(isFieldOptional(field)).toBe(true);
    });
  });
});
