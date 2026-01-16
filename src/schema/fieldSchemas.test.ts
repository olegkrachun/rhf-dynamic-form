import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { FieldElement } from "../types";
import { buildFieldSchema, isFieldOptional } from "./fieldSchemas";

describe("fieldSchemas", () => {
  describe("buildFieldSchema", () => {
    describe("base schemas", () => {
      it("should build string schema for text field", () => {
        // Arrange
        const field: FieldElement = { type: "text", name: "name" };

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema instanceof z.ZodString).toBe(true);
      });

      it("should build string schema for phone field", () => {
        // Arrange
        const field: FieldElement = { type: "phone", name: "phone" };

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema instanceof z.ZodString).toBe(true);
      });

      it("should build email schema with built-in validation", () => {
        // Arrange
        const field: FieldElement = { type: "email", name: "email" };
        const validEmail = "test@example.com";
        const invalidEmail = "notanemail";

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema.safeParse(validEmail).success).toBe(true);
        expect(schema.safeParse(invalidEmail).success).toBe(false);
      });

      it("should build boolean schema for boolean field", () => {
        // Arrange
        const field: FieldElement = { type: "boolean", name: "active" };

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema instanceof z.ZodBoolean).toBe(true);
        expect(schema.safeParse(true).success).toBe(true);
        expect(schema.safeParse(false).success).toBe(true);
      });

      it("should build string schema for date field", () => {
        // Arrange
        const field: FieldElement = { type: "date", name: "birthDate" };

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema instanceof z.ZodString).toBe(true);
        expect(schema.safeParse("2024-01-01").success).toBe(true);
      });

      it("should build unknown schema for custom field", () => {
        // Arrange
        const field: FieldElement = {
          type: "custom",
          name: "customField",
          component: "CustomComponent",
        };

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema instanceof z.ZodUnknown).toBe(true);
      });
    });

    describe("string validation", () => {
      it("should apply required validation", () => {
        // Arrange
        const field: FieldElement = {
          type: "text",
          name: "name",
          validation: { required: true },
        };
        const emptyString = "";
        const nonEmptyString = "John";

        // Act
        const schema = buildFieldSchema(field);

        // Assert - empty string should fail
        expect(schema.safeParse(emptyString).success).toBe(false);
        // Non-empty string should pass
        expect(schema.safeParse(nonEmptyString).success).toBe(true);
      });

      it("should apply minLength validation", () => {
        // Arrange
        const field: FieldElement = {
          type: "text",
          name: "name",
          validation: { minLength: 3 },
        };
        const tooShort = "Jo";
        const longEnough = "John";

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema.safeParse(tooShort).success).toBe(false);
        expect(schema.safeParse(longEnough).success).toBe(true);
      });

      it("should apply maxLength validation", () => {
        // Arrange
        const field: FieldElement = {
          type: "text",
          name: "name",
          validation: { maxLength: 5 },
        };
        const tooLong = "Jonathan";
        const shortEnough = "John";

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema.safeParse(tooLong).success).toBe(false);
        expect(schema.safeParse(shortEnough).success).toBe(true);
      });

      it("should apply pattern validation with valid regex", () => {
        // Arrange
        const field: FieldElement = {
          type: "text",
          name: "code",
          validation: { pattern: "^[A-Z]{3}$" },
        };
        const nonMatching = "abc";
        const matching = "ABC";

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema.safeParse(nonMatching).success).toBe(false);
        expect(schema.safeParse(matching).success).toBe(true);
      });

      it("should handle custom validation message", () => {
        // Arrange
        const customMessage = "Must be uppercase letters only";
        const field: FieldElement = {
          type: "text",
          name: "code",
          validation: {
            pattern: "^[A-Z]+$",
            message: customMessage,
          },
        };
        const invalidValue = "abc";

        // Act
        const schema = buildFieldSchema(field);
        const result = schema.safeParse(invalidValue);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(customMessage);
        }
      });

      it("should apply multiple validations together", () => {
        // Arrange
        const field: FieldElement = {
          type: "text",
          name: "username",
          validation: {
            required: true,
            minLength: 3,
            maxLength: 10,
            pattern: "^[a-z]+$",
          },
        };

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema.safeParse("").success).toBe(false); // Empty (required)
        expect(schema.safeParse("ab").success).toBe(false); // Too short
        expect(schema.safeParse("abcdefghijk").success).toBe(false); // Too long
        expect(schema.safeParse("ABC").success).toBe(false); // Wrong pattern
        expect(schema.safeParse("john").success).toBe(true); // Valid
      });

      it("should apply validation to email field", () => {
        // Arrange
        const field: FieldElement = {
          type: "email",
          name: "email",
          validation: { required: true },
        };

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema.safeParse("").success).toBe(false);
        expect(schema.safeParse("invalid").success).toBe(false);
        expect(schema.safeParse("test@example.com").success).toBe(true);
      });

      it("should apply validation to phone field", () => {
        // Arrange
        const field: FieldElement = {
          type: "phone",
          name: "phone",
          validation: {
            pattern: "^[0-9]{10}$",
          },
        };

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema.safeParse("123").success).toBe(false);
        expect(schema.safeParse("1234567890").success).toBe(true);
      });

      it("should apply validation to date field", () => {
        // Arrange
        const field: FieldElement = {
          type: "date",
          name: "birthDate",
          validation: { required: true },
        };

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema.safeParse("").success).toBe(false);
        expect(schema.safeParse("2024-01-01").success).toBe(true);
      });
    });

    describe("boolean validation", () => {
      it("should create schema accepting true and false when not required", () => {
        // Arrange
        const field: FieldElement = {
          type: "boolean",
          name: "subscribe",
        };

        // Act
        const schema = buildFieldSchema(field);

        // Assert
        expect(schema.safeParse(true).success).toBe(true);
        expect(schema.safeParse(false).success).toBe(true);
      });

      it("should require true when required is set", () => {
        // Arrange
        const field: FieldElement = {
          type: "boolean",
          name: "acceptTerms",
          validation: { required: true },
        };

        // Act
        const schema = buildFieldSchema(field);

        // Assert - false should fail for required boolean
        expect(schema.safeParse(false).success).toBe(false);
        // true should pass
        expect(schema.safeParse(true).success).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("should handle field without validation", () => {
        // Arrange
        const field: FieldElement = {
          type: "text",
          name: "optional",
        };

        // Act
        const schema = buildFieldSchema(field);

        // Assert - should accept any string
        expect(schema.safeParse("").success).toBe(true);
        expect(schema.safeParse("any value").success).toBe(true);
      });

      it("should not apply string validation to boolean fields", () => {
        // Arrange
        const field: FieldElement = {
          type: "boolean",
          name: "active",
          validation: { minLength: 5 }, // This should be ignored
        };

        // Act
        const schema = buildFieldSchema(field);

        // Assert - should still accept boolean values
        expect(schema.safeParse(true).success).toBe(true);
        expect(schema.safeParse(false).success).toBe(true);
      });

      it("should not apply string validation to custom fields", () => {
        // Arrange
        const field: FieldElement = {
          type: "custom",
          name: "custom",
          component: "CustomComponent",
          validation: { required: true }, // This should be ignored
        };

        // Act
        const schema = buildFieldSchema(field);

        // Assert - should accept any value
        expect(schema.safeParse("").success).toBe(true);
        expect(schema.safeParse(null).success).toBe(true);
        expect(schema.safeParse(undefined).success).toBe(true);
      });
    });
  });

  describe("isFieldOptional", () => {
    it("should return true for field without validation", () => {
      // Arrange
      const field: FieldElement = {
        type: "text",
        name: "optional",
      };

      // Act
      const result = isFieldOptional(field);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for field with validation but not required", () => {
      // Arrange
      const field: FieldElement = {
        type: "text",
        name: "optional",
        validation: { minLength: 3 },
      };

      // Act
      const result = isFieldOptional(field);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for required field", () => {
      // Arrange
      const field: FieldElement = {
        type: "text",
        name: "required",
        validation: { required: true },
      };

      // Act
      const result = isFieldOptional(field);

      // Assert
      expect(result).toBe(false);
    });

    it("should return true when required is explicitly false", () => {
      // Arrange
      const field: FieldElement = {
        type: "text",
        name: "optional",
        validation: { required: false },
      };

      // Act
      const result = isFieldOptional(field);

      // Assert
      expect(result).toBe(true);
    });

    it("should work with all field types", () => {
      // Arrange
      const textField: FieldElement = {
        type: "text",
        name: "text",
        validation: { required: true },
      };
      const emailField: FieldElement = {
        type: "email",
        name: "email",
        validation: { required: true },
      };
      const booleanField: FieldElement = {
        type: "boolean",
        name: "boolean",
        validation: { required: true },
      };

      // Act & Assert
      expect(isFieldOptional(textField)).toBe(false);
      expect(isFieldOptional(emailField)).toBe(false);
      expect(isFieldOptional(booleanField)).toBe(false);
    });
  });
});
