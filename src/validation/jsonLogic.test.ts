import { describe, expect, it } from "vitest";
import { applyJsonLogic, evaluateCondition } from "./jsonLogic";

describe("applyJsonLogic", () => {
  describe("basic operations", () => {
    it("should evaluate simple variable access", () => {
      const rule = { var: "name" };
      const data = { name: "John" };
      expect(applyJsonLogic(rule, data)).toBe("John");
    });

    it("should evaluate nested variable access", () => {
      const rule = { var: "source.name" };
      const data = { source: { name: "John" } };
      expect(applyJsonLogic(rule, data)).toBe("John");
    });

    it("should evaluate equality", () => {
      const rule = { "==": [{ var: "status" }, "active"] };
      expect(applyJsonLogic(rule, { status: "active" })).toBe(true);
      expect(applyJsonLogic(rule, { status: "inactive" })).toBe(false);
    });

    it("should evaluate boolean AND", () => {
      const rule = { and: [{ var: "a" }, { var: "b" }] };
      expect(applyJsonLogic(rule, { a: true, b: true })).toBe(true);
      expect(applyJsonLogic(rule, { a: true, b: false })).toBe(false);
    });

    it("should evaluate boolean OR", () => {
      const rule = { or: [{ var: "a" }, { var: "b" }] };
      expect(applyJsonLogic(rule, { a: false, b: true })).toBe(true);
      expect(applyJsonLogic(rule, { a: false, b: false })).toBe(false);
    });

    it("should evaluate NOT", () => {
      const rule = { "!": { var: "disabled" } };
      expect(applyJsonLogic(rule, { disabled: false })).toBe(true);
      expect(applyJsonLogic(rule, { disabled: true })).toBe(false);
    });

    it("should evaluate numeric comparison", () => {
      const rule = { ">=": [{ var: "age" }, 18] };
      expect(applyJsonLogic(rule, { age: 21 })).toBe(true);
      expect(applyJsonLogic(rule, { age: 18 })).toBe(true);
      expect(applyJsonLogic(rule, { age: 16 })).toBe(false);
    });
  });

  describe("regex_match custom operation", () => {
    it("should match valid 10-digit phone pattern", () => {
      const rule = { regex_match: ["^[0-9]{10}$", { var: "phone" }] };
      expect(applyJsonLogic(rule, { phone: "1234567890" })).toBe(true);
      expect(applyJsonLogic(rule, { phone: "123456789" })).toBe(false);
      expect(applyJsonLogic(rule, { phone: "12345678901" })).toBe(false);
      expect(applyJsonLogic(rule, { phone: "123-456-7890" })).toBe(false);
    });

    it("should handle email pattern", () => {
      const rule = { regex_match: ["^[^@]+@[^@]+\\.[^@]+$", { var: "email" }] };
      expect(applyJsonLogic(rule, { email: "test@example.com" })).toBe(true);
      expect(applyJsonLogic(rule, { email: "invalid" })).toBe(false);
      expect(applyJsonLogic(rule, { email: "no@domain" })).toBe(false);
    });

    it("should return false for non-string values", () => {
      const rule = { regex_match: ["^test$", { var: "value" }] };
      expect(applyJsonLogic(rule, { value: 123 })).toBe(false);
      expect(applyJsonLogic(rule, { value: null })).toBe(false);
      expect(applyJsonLogic(rule, { value: undefined })).toBe(false);
      expect(applyJsonLogic(rule, { value: {} })).toBe(false);
    });

    it("should handle invalid regex gracefully", () => {
      const rule = { regex_match: ["[invalid", { var: "value" }] };
      expect(applyJsonLogic(rule, { value: "test" })).toBe(false);
    });

    it("should match uppercase letters only pattern", () => {
      const rule = { regex_match: ["^[A-Z]+$", { var: "code" }] };
      expect(applyJsonLogic(rule, { code: "ABC" })).toBe(true);
      expect(applyJsonLogic(rule, { code: "abc" })).toBe(false);
      expect(applyJsonLogic(rule, { code: "AbC" })).toBe(false);
    });
  });

  describe("compound conditions", () => {
    it("should evaluate phone validation example from requirements", () => {
      const rule = {
        or: [
          {
            and: [
              { var: "source.has_phone" },
              { regex_match: ["^[0-9]{10}$", { var: "source.phone" }] },
            ],
          },
          { "!": { var: "source.has_phone" } },
        ],
      };

      // No phone required, no phone provided - valid
      expect(
        applyJsonLogic(rule, { source: { has_phone: false, phone: "" } })
      ).toBe(true);

      // Phone required, valid phone - valid
      expect(
        applyJsonLogic(rule, {
          source: { has_phone: true, phone: "1234567890" },
        })
      ).toBe(true);

      // Phone required, invalid phone - invalid
      expect(
        applyJsonLogic(rule, { source: { has_phone: true, phone: "123" } })
      ).toBe(false);

      // Phone required, no phone - invalid
      expect(
        applyJsonLogic(rule, { source: { has_phone: true, phone: "" } })
      ).toBe(false);
    });

    it("should evaluate age and terms acceptance condition", () => {
      const rule = {
        and: [{ ">=": [{ var: "age" }, 18] }, { var: "acceptTerms" }],
      };

      expect(applyJsonLogic(rule, { age: 21, acceptTerms: true })).toBe(true);
      expect(applyJsonLogic(rule, { age: 21, acceptTerms: false })).toBe(false);
      expect(applyJsonLogic(rule, { age: 16, acceptTerms: true })).toBe(false);
    });
  });
});

describe("evaluateCondition", () => {
  it("should return boolean true for truthy results", () => {
    expect(evaluateCondition({ var: "active" }, { active: true })).toBe(true);
    expect(evaluateCondition({ var: "value" }, { value: "non-empty" })).toBe(
      true
    );
    expect(evaluateCondition({ var: "count" }, { count: 1 })).toBe(true);
  });

  it("should return boolean false for falsy results", () => {
    expect(evaluateCondition({ var: "active" }, { active: false })).toBe(false);
    expect(evaluateCondition({ var: "value" }, { value: "" })).toBe(false);
    expect(evaluateCondition({ var: "value" }, { value: 0 })).toBe(false);
    expect(evaluateCondition({ var: "value" }, { value: null })).toBe(false);
  });

  it("should evaluate complex condition and return boolean", () => {
    const rule = {
      or: [
        { "!": { var: "hasPhone" } },
        { regex_match: ["^[0-9]{10}$", { var: "phone" }] },
      ],
    };

    expect(evaluateCondition(rule, { hasPhone: false, phone: "" })).toBe(true);
    expect(
      evaluateCondition(rule, { hasPhone: true, phone: "1234567890" })
    ).toBe(true);
    expect(evaluateCondition(rule, { hasPhone: true, phone: "123" })).toBe(
      false
    );
  });
});
