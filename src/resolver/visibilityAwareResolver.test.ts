import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createVisibilityAwareResolver } from "./visibilityAwareResolver";

describe("createVisibilityAwareResolver", () => {
  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(10, "Phone must be at least 10 characters"),
    email: z.string().email("Invalid email"),
  });

  it("should pass through all errors when invisibleFieldValidation is 'validate'", async () => {
    const resolver = createVisibilityAwareResolver({
      schema,
      getVisibility: () => ({ name: true, phone: false, email: true }),
      invisibleFieldValidation: "validate",
    });

    const result = await resolver(
      { name: "", phone: "123", email: "invalid" },
      {},
      {
        criteriaMode: "all",
        fields: {},
        names: [],
        shouldUseNativeValidation: false,
      }
    );

    // All fields should have errors, regardless of visibility
    expect(result.errors.name).toBeDefined();
    expect(result.errors.phone).toBeDefined();
    expect(result.errors.email).toBeDefined();
  });

  it("should filter out errors for invisible fields when invisibleFieldValidation is 'skip'", async () => {
    const resolver = createVisibilityAwareResolver({
      schema,
      getVisibility: () => ({ name: true, phone: false, email: true }),
      invisibleFieldValidation: "skip",
    });

    const result = await resolver(
      { name: "", phone: "123", email: "invalid" },
      {},
      {
        criteriaMode: "all",
        fields: {},
        names: [],
        shouldUseNativeValidation: false,
      }
    );

    // Visible fields should have errors
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
    // Invisible field should not have errors
    expect(result.errors.phone).toBeUndefined();
  });

  it("should mark errors as warnings for invisible fields when invisibleFieldValidation is 'warn'", async () => {
    const resolver = createVisibilityAwareResolver({
      schema,
      getVisibility: () => ({ name: true, phone: false, email: true }),
      invisibleFieldValidation: "warn",
    });

    const result = await resolver(
      { name: "", phone: "123", email: "invalid" },
      {},
      {
        criteriaMode: "all",
        fields: {},
        names: [],
        shouldUseNativeValidation: false,
      }
    );

    // Visible fields should have normal errors
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
    // Invisible field should have error marked as warning
    expect(result.errors.phone).toBeDefined();
    expect((result.errors.phone as { type: string }).type).toBe("warning");
  });

  it("should cascade hidden state to array item sub-field errors when the array field is hidden", async () => {
    // A hidden array field ("insurers": false) must also hide per-row errors
    // like "insurers.0.claimNumber.value" — those deep paths are never in the
    // visibility map (calculateVisibility does not recurse into itemFields),
    // so without ancestor cascading they default to visible and block submit.
    const arraySchema = z.object({
      insurers: z.array(
        z.object({
          claimNumber: z.object({
            value: z.string().min(1, "Claim Number is required."),
          }),
        })
      ),
    });

    const resolver = createVisibilityAwareResolver({
      schema: arraySchema,
      getVisibility: () => ({ insurers: false }),
      invisibleFieldValidation: "skip",
    });

    const result = await resolver(
      { insurers: [{ claimNumber: { value: "" } }] },
      {},
      {
        criteriaMode: "all",
        fields: {},
        names: [],
        shouldUseNativeValidation: false,
      }
    );

    expect(result.errors.insurers).toBeUndefined();
  });

  it("should keep array item sub-field errors when the array field is visible", async () => {
    const arraySchema = z.object({
      insurers: z.array(
        z.object({
          claimNumber: z.object({
            value: z.string().min(1, "Claim Number is required."),
          }),
        })
      ),
    });

    const resolver = createVisibilityAwareResolver({
      schema: arraySchema,
      getVisibility: () => ({ insurers: true }),
      invisibleFieldValidation: "skip",
    });

    const result = await resolver(
      { insurers: [{ claimNumber: { value: "" } }] },
      {},
      {
        criteriaMode: "all",
        fields: {},
        names: [],
        shouldUseNativeValidation: false,
      }
    );

    expect(result.errors.insurers).toBeDefined();
  });

  it("should mark array item sub-field errors as warnings when the array field is hidden in warn mode", async () => {
    const arraySchema = z.object({
      insurers: z.array(
        z.object({
          claimNumber: z.object({
            value: z.string().min(1, "Claim Number is required."),
          }),
        })
      ),
    });

    const resolver = createVisibilityAwareResolver({
      schema: arraySchema,
      getVisibility: () => ({ insurers: false }),
      invisibleFieldValidation: "warn",
    });

    const result = await resolver(
      { insurers: [{ claimNumber: { value: "" } }] },
      {},
      {
        criteriaMode: "all",
        fields: {},
        names: [],
        shouldUseNativeValidation: false,
      }
    );

    const leaf = (
      result.errors as unknown as {
        insurers?: { claimNumber?: { value?: { type: string } } }[];
      }
    ).insurers?.[0]?.claimNumber?.value;
    expect(leaf).toBeDefined();
    expect(leaf?.type).toBe("warning");
  });

  it("should include all errors when all fields are visible", async () => {
    const resolver = createVisibilityAwareResolver({
      schema,
      getVisibility: () => ({ name: true, phone: true, email: true }),
      invisibleFieldValidation: "skip",
    });

    const result = await resolver(
      { name: "", phone: "123", email: "invalid" },
      {},
      {
        criteriaMode: "all",
        fields: {},
        names: [],
        shouldUseNativeValidation: false,
      }
    );

    expect(result.errors.name).toBeDefined();
    expect(result.errors.phone).toBeDefined();
    expect(result.errors.email).toBeDefined();
  });

  it("should return no errors when validation passes", async () => {
    const resolver = createVisibilityAwareResolver({
      schema,
      getVisibility: () => ({ name: true, phone: true, email: true }),
      invisibleFieldValidation: "skip",
    });

    const result = await resolver(
      { name: "John", phone: "1234567890", email: "test@example.com" },
      {},
      {
        criteriaMode: "all",
        fields: {},
        names: [],
        shouldUseNativeValidation: false,
      }
    );

    expect(result.errors).toEqual({});
  });

  it("should handle fields not in visibility map (default to visible)", async () => {
    const resolver = createVisibilityAwareResolver({
      schema,
      getVisibility: () => ({ name: true }), // phone and email not in map
      invisibleFieldValidation: "skip",
    });

    const result = await resolver(
      { name: "", phone: "123", email: "invalid" },
      {},
      {
        criteriaMode: "all",
        fields: {},
        names: [],
        shouldUseNativeValidation: false,
      }
    );

    // All fields should have errors since undefined visibility defaults to visible
    expect(result.errors.name).toBeDefined();
    expect(result.errors.phone).toBeDefined();
    expect(result.errors.email).toBeDefined();
  });

  it("should use dynamic visibility from getVisibility function", async () => {
    let phoneVisible = false;

    const resolver = createVisibilityAwareResolver({
      schema,
      getVisibility: () => ({ name: true, phone: phoneVisible, email: true }),
      invisibleFieldValidation: "skip",
    });

    // First call - phone is invisible
    const result1 = await resolver(
      { name: "John", phone: "123", email: "test@example.com" },
      {},
      {
        criteriaMode: "all",
        fields: {},
        names: [],
        shouldUseNativeValidation: false,
      }
    );
    expect(result1.errors.phone).toBeUndefined();

    // Change visibility
    phoneVisible = true;

    // Second call - phone is now visible
    const result2 = await resolver(
      { name: "John", phone: "123", email: "test@example.com" },
      {},
      {
        criteriaMode: "all",
        fields: {},
        names: [],
        shouldUseNativeValidation: false,
      }
    );
    expect(result2.errors.phone).toBeDefined();
  });
});
