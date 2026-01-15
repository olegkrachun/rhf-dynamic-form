import { describe, expect, it } from "vitest";
import type { FormConfiguration } from "../types";
import { generateZodSchema } from "./generateSchema";

describe("generateZodSchema with JSON Logic conditions", () => {
  it("should validate simple boolean condition", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "boolean",
          name: "acceptTerms",
          label: "Accept Terms",
          validation: {
            condition: { var: "acceptTerms" },
            message: "You must accept the terms",
          },
        },
      ],
    };

    const schema = generateZodSchema(config);

    const failResult = schema.safeParse({ acceptTerms: false });
    expect(failResult.success).toBe(false);
    if (!failResult.success) {
      expect(failResult.error.issues[0].message).toBe(
        "You must accept the terms"
      );
      expect(failResult.error.issues[0].path).toEqual(["acceptTerms"]);
    }

    const passResult = schema.safeParse({ acceptTerms: true });
    expect(passResult.success).toBe(true);
  });

  it("should validate cross-field condition", () => {
    const config: FormConfiguration = {
      elements: [
        { type: "boolean", name: "has_phone", label: "Has Phone" },
        {
          type: "phone",
          name: "phone",
          label: "Phone",
          validation: {
            condition: {
              or: [
                { "!": { var: "has_phone" } },
                {
                  and: [
                    { var: "has_phone" },
                    { regex_match: ["^[0-9]{10}$", { var: "phone" }] },
                  ],
                },
              ],
            },
            message: "Please enter a valid 10-digit phone number",
          },
        },
      ],
    };

    const schema = generateZodSchema(config);

    // No phone required - should pass
    expect(schema.safeParse({ has_phone: false, phone: "" }).success).toBe(
      true
    );

    // Phone required with valid phone - should pass
    expect(
      schema.safeParse({ has_phone: true, phone: "1234567890" }).success
    ).toBe(true);

    // Phone required with invalid phone - should fail
    const failResult = schema.safeParse({ has_phone: true, phone: "123" });
    expect(failResult.success).toBe(false);
    if (!failResult.success) {
      expect(failResult.error.issues[0].path).toEqual(["phone"]);
      expect(failResult.error.issues[0].message).toBe(
        "Please enter a valid 10-digit phone number"
      );
    }
  });

  it("should validate nested field paths in conditions", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "boolean",
          name: "source.has_phone",
          label: "Has Phone",
        },
        {
          type: "phone",
          name: "source.phone",
          label: "Phone",
          validation: {
            condition: {
              or: [
                { "!": { var: "source.has_phone" } },
                { regex_match: ["^[0-9]{10}$", { var: "source.phone" }] },
              ],
            },
            message: "Invalid phone number",
          },
        },
      ],
    };

    const schema = generateZodSchema(config);

    const passResult = schema.safeParse({
      source: { has_phone: true, phone: "1234567890" },
    });
    expect(passResult.success).toBe(true);

    const failResult = schema.safeParse({
      source: { has_phone: true, phone: "123" },
    });
    expect(failResult.success).toBe(false);
    if (!failResult.success) {
      expect(failResult.error.issues[0].path).toEqual(["source", "phone"]);
    }
  });

  it("should use default message when none provided", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "boolean",
          name: "active",
          label: "Active",
          validation: {
            condition: { var: "active" },
          },
        },
      ],
    };

    const schema = generateZodSchema(config);
    const result = schema.safeParse({ active: false });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Validation failed");
    }
  });

  it("should combine with built-in validation rules", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "text",
          name: "code",
          label: "Code",
          validation: {
            required: true,
            minLength: 3,
            condition: { regex_match: ["^[A-Z]+$", { var: "code" }] },
            message: "Code must be uppercase letters only",
          },
        },
      ],
    };

    const schema = generateZodSchema(config);

    // Empty - fails required
    const emptyResult = schema.safeParse({ code: "" });
    expect(emptyResult.success).toBe(false);

    // Too short - fails minLength
    const shortResult = schema.safeParse({ code: "AB" });
    expect(shortResult.success).toBe(false);

    // Lowercase - fails condition (but passes built-in rules)
    const lowercaseResult = schema.safeParse({ code: "abc" });
    expect(lowercaseResult.success).toBe(false);
    if (!lowercaseResult.success) {
      // Should have the custom message from condition
      const conditionError = lowercaseResult.error.issues.find(
        (i) => i.message === "Code must be uppercase letters only"
      );
      expect(conditionError).toBeDefined();
    }

    // Valid - passes all
    const validResult = schema.safeParse({ code: "ABC" });
    expect(validResult.success).toBe(true);
  });

  it("should handle multiple fields with conditions", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "boolean",
          name: "termsAccepted",
          label: "Terms",
          validation: {
            condition: { var: "termsAccepted" },
            message: "Must accept terms",
          },
        },
        {
          type: "boolean",
          name: "privacyAccepted",
          label: "Privacy",
          validation: {
            condition: { var: "privacyAccepted" },
            message: "Must accept privacy policy",
          },
        },
      ],
    };

    const schema = generateZodSchema(config);

    // Both false - both errors
    const bothFalseResult = schema.safeParse({
      termsAccepted: false,
      privacyAccepted: false,
    });
    expect(bothFalseResult.success).toBe(false);
    if (!bothFalseResult.success) {
      expect(bothFalseResult.error.issues).toHaveLength(2);
    }

    // One false - one error
    const oneResult = schema.safeParse({
      termsAccepted: true,
      privacyAccepted: false,
    });
    expect(oneResult.success).toBe(false);
    if (!oneResult.success) {
      expect(oneResult.error.issues).toHaveLength(1);
      expect(oneResult.error.issues[0].message).toBe(
        "Must accept privacy policy"
      );
    }

    // Both true - passes
    const passResult = schema.safeParse({
      termsAccepted: true,
      privacyAccepted: true,
    });
    expect(passResult.success).toBe(true);
  });

  it("should work without any conditions", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "text",
          name: "name",
          label: "Name",
          validation: { required: true },
        },
      ],
    };

    const schema = generateZodSchema(config);

    expect(schema.safeParse({ name: "" }).success).toBe(false);
    expect(schema.safeParse({ name: "John" }).success).toBe(true);
  });
});
