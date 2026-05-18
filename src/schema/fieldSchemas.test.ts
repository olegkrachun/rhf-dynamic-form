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

    it("should build schema for date field", () => {
      const field: BaseFieldElement = {
        type: "date",
        name: "birthDate",
      };

      const schema = buildFieldSchema(field);

      // Common single-date formats — all accepted
      expect(schema.safeParse("2024-01-15").success).toBe(true); // ISO
      expect(schema.safeParse("01/15/2024").success).toBe(true); // US slash
      expect(schema.safeParse("01-15-2024").success).toBe(true); // US dash
      expect(schema.safeParse("15.01.2024").success).toBe(true); // EU dot

      // Empty string is valid (required-handling lives separately)
      expect(schema.safeParse("").success).toBe(true);

      // Multi-date / OCR-garbage strings are rejected
      expect(
        schema.safeParse("03/25/2022\n03/30/2022-03/30/2022").success
      ).toBe(false);
      expect(schema.safeParse("not-a-date").success).toBe(false);
      expect(schema.safeParse("01/02/03/04").success).toBe(false);
    });

    it("should defer to consumer's validation.pattern when provided (skip the library default format check)", () => {
      // Strict consumer pattern: ONLY MM/dd/yyyy with 4-digit year
      const field: BaseFieldElement = {
        type: "date",
        name: "submittedAt",
        validation: {
          pattern: "^\\d{2}/\\d{2}/\\d{4}$",
          message: "Must be MM/DD/YYYY",
        },
      };

      const schema = buildFieldSchema(field);

      // Strict format passes
      expect(schema.safeParse("01/15/2024").success).toBe(true);

      // Default-loose format that's NOT MM/dd/yyyy fails the consumer pattern
      const dashResult = schema.safeParse("01-15-2024");
      expect(dashResult.success).toBe(false);
      if (!dashResult.success) {
        // Error is from the consumer's pattern, not the library default
        expect(dashResult.error.issues[0].message).toBe("Must be MM/DD/YYYY");
      }

      // Garbage still fails (consumer's pattern catches it too)
      expect(
        schema.safeParse("03/25/2022\n03/30/2022-03/30/2022").success
      ).toBe(false);
    });

    it("should produce a clear required-message for empty required date fields (not the format message)", () => {
      const field: BaseFieldElement = {
        type: "date",
        name: "birthDate",
        validation: { required: true },
      };

      const schema = buildFieldSchema(field);

      // Valid date passes
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

      // Malformed non-empty value produces format-message (not required)
      const garbageResult = schema.safeParse("03/25/2022\n03/30/2022");
      expect(garbageResult.success).toBe(false);
      if (!garbageResult.success) {
        expect(garbageResult.error.issues[0].message).toBe(
          "Must be a valid date"
        );
      }
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
