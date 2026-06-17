import { afterEach, describe, expect, it, vi } from "vitest";
import type { OptionsResolver, SelectOption } from "../types";
import { resolveSelectOptions } from "./resolveSelectOptions";

const baseCtx = { fieldName: "bankAccount" };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveSelectOptions — static", () => {
  it("returns the array unchanged (same reference)", () => {
    const options: SelectOption[] = [{ label: "Chase", value: "chase" }];
    const result = resolveSelectOptions(options, {
      ...baseCtx,
      formValues: {},
    });
    expect(result).toBe(options);
  });

  it("returns [] for undefined options", () => {
    expect(
      resolveSelectOptions(undefined, { ...baseCtx, formValues: {} })
    ).toEqual([]);
  });
});

describe("resolveSelectOptions — data-map (object array)", () => {
  const formValues = {
    data: {
      bankAccounts: [
        { bankName: "Chase", bankAccountNumber: "111" },
        { bankName: "Citibank", bankAccountNumber: 222 },
      ],
    },
  };

  it("maps labelPath/valuePath from each item, preserving order", () => {
    const result = resolveSelectOptions(
      {
        sourceField: "data.bankAccounts",
        labelPath: "bankName",
        valuePath: "bankAccountNumber",
      },
      { ...baseCtx, formValues }
    );
    expect(result).toEqual([
      { label: "Chase", value: "111" },
      { label: "Citibank", value: 222 },
    ]);
  });

  it("skips items whose resolved value is not a string/number", () => {
    const result = resolveSelectOptions(
      { sourceField: "items", labelPath: "name", valuePath: "id" },
      {
        ...baseCtx,
        formValues: {
          items: [
            { name: "ok", id: "1" },
            { name: "missing-id", id: null },
            { name: "object-id", id: { nested: true } },
            { name: "kept", id: 2 },
          ],
        },
      }
    );
    expect(result).toEqual([
      { label: "ok", value: "1" },
      { label: "kept", value: 2 },
    ]);
  });

  it("does not dedupe by default", () => {
    const result = resolveSelectOptions(
      { sourceField: "items", labelPath: "name", valuePath: "id" },
      {
        ...baseCtx,
        formValues: {
          items: [
            { name: "A", id: "1" },
            { name: "A", id: "1" },
          ],
        },
      }
    );
    expect(result).toHaveLength(2);
  });
});

describe("resolveSelectOptions — data-map (primitive array)", () => {
  it("uses each item as both label and value when paths omitted", () => {
    const result = resolveSelectOptions(
      { sourceField: "data.bankAccounts" },
      {
        ...baseCtx,
        formValues: { data: { bankAccounts: ["Chase", "Citibank"] } },
      }
    );
    expect(result).toEqual([
      { label: "Chase", value: "Chase" },
      { label: "Citibank", value: "Citibank" },
    ]);
  });

  it("warns and returns [] when sourceField is missing or not an array", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const missing = resolveSelectOptions(
      { sourceField: "data.nope" },
      { ...baseCtx, formValues: {} }
    );
    const notArray = resolveSelectOptions(
      { sourceField: "data.x" },
      { ...baseCtx, formValues: { data: { x: "not-an-array" } } }
    );
    expect(missing).toEqual([]);
    expect(notArray).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe("resolveSelectOptions — resolver", () => {
  it("invokes a sync resolver with { formValues, fieldName }", () => {
    const resolver = vi.fn<OptionsResolver>(() => [
      { label: "Chase", value: "chase" },
    ]);
    const formValues = { customerId: "abc" };
    const result = resolveSelectOptions(
      { type: "resolver", name: "banks" },
      { ...baseCtx, formValues, resolvers: { banks: resolver } }
    );
    expect(result).toEqual([{ label: "Chase", value: "chase" }]);
    expect(resolver).toHaveBeenCalledWith({
      formValues,
      fieldName: "bankAccount",
    });
  });

  it("returns the promise from an async resolver", async () => {
    const resolver: OptionsResolver = () =>
      Promise.resolve([{ label: "Async", value: "a" }]);
    const result = resolveSelectOptions(
      { type: "resolver", name: "banks" },
      { ...baseCtx, formValues: {}, resolvers: { banks: resolver } }
    );
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toEqual([{ label: "Async", value: "a" }]);
  });

  it("warns and returns [] for an unknown resolver name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = resolveSelectOptions(
      { type: "resolver", name: "missing" },
      { ...baseCtx, formValues: {}, resolvers: {} }
    );
    expect(result).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
  });
});
