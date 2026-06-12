import { describe, expect, it } from "vitest";
import type { FieldElement, FormConfiguration } from "../types";
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

describe("generateZodSchema with array itemField conditions", () => {
  const config: FormConfiguration = {
    elements: [
      { type: "boolean", name: "isMedical", label: "Is Medical" },
      {
        type: "array",
        name: "insurers",
        label: "Insurers",
        itemFields: [
          {
            type: "text",
            name: "claimNumber.value",
            label: "Claim Number",
            validation: {
              condition: {
                or: [
                  { var: "$item.claimNumber.value" },
                  { var: "$item.policyNumber.value" },
                ],
              },
              message: "Provide a Claim Number or a Policy Number.",
            },
          },
          { type: "text", name: "policyNumber.value", label: "Policy Number" },
          {
            type: "text",
            name: "name.value",
            label: "Name",
            validation: {
              condition: {
                if: [
                  { var: "isMedical" },
                  { "!!": { var: "$item.name.value" } },
                  true,
                ],
              },
              message: "Name required when Medical.",
            },
          },
        ],
      },
    ],
  };

  const row = (
    claim: string,
    policy: string,
    name: string
  ): Record<string, { value: string }> => ({
    claimNumber: { value: claim },
    policyNumber: { value: policy },
    name: { value: name },
  });

  it("blocks when an item's anyOf cross-field condition fails (both empty)", () => {
    const schema = generateZodSchema(config);
    const result = schema.safeParse({
      isMedical: false,
      insurers: [row("", "", "Acme")],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.message === "Provide a Claim Number or a Policy Number."
      );
      expect(issue?.path).toEqual(["insurers", 0, "claimNumber", "value"]);
    }
  });

  it("passes when at least one of the anyOf fields is filled", () => {
    const schema = generateZodSchema(config);
    const result = schema.safeParse({
      isMedical: false,
      insurers: [row("C-1", "", "Acme")],
    });
    expect(result.success).toBe(true);
  });

  it("evaluates a top-level gate inside an item condition (conditional required)", () => {
    const schema = generateZodSchema(config);

    // isMedical true + empty name → blocked
    const failing = schema.safeParse({
      isMedical: true,
      insurers: [row("C-1", "", "")],
    });
    expect(failing.success).toBe(false);

    // isMedical false + empty name → allowed
    const passing = schema.safeParse({
      isMedical: false,
      insurers: [row("C-1", "", "")],
    });
    expect(passing.success).toBe(true);
  });

  it("reports the correct item index for multi-row arrays", () => {
    const schema = generateZodSchema(config);
    const result = schema.safeParse({
      isMedical: false,
      insurers: [row("C-1", "", "Acme"), row("", "", "Beta")],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.message === "Provide a Claim Number or a Policy Number."
      );
      expect(issue?.path).toEqual(["insurers", 1, "claimNumber", "value"]);
    }
  });

  it("collects conditions from itemFields nested inside a container (unparsed config, defense-in-depth)", () => {
    // Containers inside itemFields are rejected by both the TS types and
    // parseConfiguration, but generateZodSchema is a public export and can
    // receive a config that bypassed parsing — hence the cast.
    const nestedConfig: FormConfiguration = {
      elements: [
        {
          type: "array",
          name: "insurers",
          label: "Insurers",
          itemFields: [
            {
              type: "container",
              variant: "row",
              children: [
                {
                  type: "text",
                  name: "claimNumber.value",
                  label: "Claim Number",
                  validation: {
                    condition: { "!!": { var: "$item.claimNumber.value" } },
                    message: "Claim Number is required.",
                  },
                },
              ],
            },
          ] as unknown as FieldElement[],
        },
      ],
    };

    const schema = generateZodSchema(nestedConfig);
    const result = schema.safeParse({
      insurers: [{ claimNumber: { value: "" } }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.message === "Claim Number is required."
      );
      expect(issue?.path).toEqual(["insurers", 0, "claimNumber", "value"]);
    }

    expect(
      schema.safeParse({ insurers: [{ claimNumber: { value: "C-1" } }] })
        .success
    ).toBe(true);
  });
});

describe("generateZodSchema with nested array itemField conditions", () => {
  const config: FormConfiguration = {
    elements: [
      {
        type: "array",
        name: "families",
        label: "Families",
        itemFields: [
          { type: "text", name: "familyName.value", label: "Family Name" },
          {
            type: "array",
            name: "children",
            label: "Children",
            itemFields: [
              {
                type: "text",
                name: "name.value",
                label: "Name",
                validation: {
                  condition: { "!!": { var: "$item.name.value" } },
                  message: "Child name required.",
                },
              },
            ],
          },
        ],
      },
    ],
  };

  it("enforces a condition on an inner array row with the full nested path", () => {
    const schema = generateZodSchema(config);
    const result = schema.safeParse({
      families: [
        { familyName: { value: "Smith" }, children: [{ name: { value: "" } }] },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.message === "Child name required."
      );
      expect(issue?.path).toEqual([
        "families",
        0,
        "children",
        0,
        "name",
        "value",
      ]);
    }
  });

  it("passes when the inner array row condition is satisfied", () => {
    const schema = generateZodSchema(config);
    const result = schema.safeParse({
      families: [
        {
          familyName: { value: "Smith" },
          children: [{ name: { value: "Jo" } }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("generateZodSchema condition / base-error independence", () => {
  const config: FormConfiguration = {
    elements: [
      {
        type: "text",
        name: "requiredField.value",
        label: "Required",
        validation: { required: true },
      },
      {
        type: "checkbox",
        name: "flag.value",
        label: "Flag",
        validation: {
          condition: { "!": { var: "flag.value" } },
          message: "Flag must be off",
        },
      },
    ],
  };

  it("fires a cross-field condition even when a required base field is empty", () => {
    const schema = generateZodSchema(config);
    // requiredField empty (base error) AND flag on (condition error)
    const result = schema.safeParse({
      requiredField: { value: "" },
      flag: { value: true },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      // base required error still surfaces…
      expect(
        result.error.issues.some(
          (i) => i.path.join(".") === "requiredField.value"
        )
      ).toBe(true);
      // …and the condition error fires alongside it (not suppressed)
      expect(messages).toContain("Flag must be off");
    }
  });

  it("passes once both base and condition are satisfied", () => {
    const schema = generateZodSchema(config);
    const result = schema.safeParse({
      requiredField: { value: "ok" },
      flag: { value: false },
    });
    expect(result.success).toBe(true);
  });
});

describe("generateZodSchema with a throwing condition", () => {
  const config: FormConfiguration = {
    elements: [
      {
        type: "text",
        name: "broken.value",
        label: "Broken",
        validation: {
          condition: { unknown_operation: [{ var: "broken.value" }] },
          message: "Broken condition",
        },
      },
      {
        type: "checkbox",
        name: "flag.value",
        label: "Flag",
        validation: {
          condition: { "!": { var: "flag.value" } },
          message: "Flag must be off",
        },
      },
    ],
  };

  it("fails closed on the broken condition instead of throwing", () => {
    const schema = generateZodSchema(config);

    const result = schema.safeParse({
      broken: { value: "x" },
      flag: { value: false },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const broken = result.error.issues.find(
        (issue) => issue.path.join(".") === "broken.value"
      );
      expect(broken?.message).toBe("Broken condition");
    }
  });

  it("still evaluates the remaining conditions", () => {
    const schema = generateZodSchema(config);

    const result = schema.safeParse({
      broken: { value: "x" },
      flag: { value: true },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Flag must be off");
    }
  });
});
