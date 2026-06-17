import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DynamicFormContext, type DynamicFormContextValue } from "../context";
import type {
  ComponentRegistry,
  FormData,
  OptionsResolver,
  SelectFieldElement,
  SelectOption,
} from "../types";
import { useSelectOptions } from "./useSelectOptions";

// Module-level test config consumed by the top-level Wrapper (avoids defining
// components inside test functions).
let testDefaults: FormData = {};
let testResolvers: Record<string, OptionsResolver> | undefined;
let capturedForm: UseFormReturn<FormData> | null = null;

function Wrapper({ children }: { children: ReactNode }) {
  const form = useForm<FormData>({ defaultValues: testDefaults });
  capturedForm = form;
  const components: ComponentRegistry = {
    fields: {},
    resolvers: testResolvers,
  };
  const value: DynamicFormContextValue = {
    form,
    config: { elements: [] },
    components,
    visibility: {},
    isValid: true,
    errors: {},
  };
  return (
    <DynamicFormContext.Provider value={value}>
      {children}
    </DynamicFormContext.Provider>
  );
}

const getForm = (): UseFormReturn<FormData> => {
  if (!capturedForm) {
    throw new Error("form was not captured");
  }
  return capturedForm;
};

beforeEach(() => {
  testDefaults = {};
  testResolvers = undefined;
  capturedForm = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const selectConfig = (
  options: SelectFieldElement["options"]
): SelectFieldElement => ({
  type: "select",
  name: "field",
  options,
});

describe("useSelectOptions — static", () => {
  it("returns the static options synchronously", () => {
    const opts: SelectOption[] = [{ label: "A", value: "a" }];
    const { result } = renderHook(
      () => useSelectOptions(selectConfig(opts), "field"),
      { wrapper: Wrapper }
    );
    expect(result.current.options).toEqual(opts);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useSelectOptions — data-map reactivity", () => {
  it("recomputes options when the sourceField data changes", async () => {
    testDefaults = {
      data: { bankAccounts: [{ bankName: "Chase", bankAccountNumber: "111" }] },
    };
    const config = selectConfig({
      sourceField: "data.bankAccounts",
      labelPath: "bankName",
      valuePath: "bankAccountNumber",
    });
    const { result } = renderHook(() => useSelectOptions(config, "field"), {
      wrapper: Wrapper,
    });

    expect(result.current.options).toEqual([{ label: "Chase", value: "111" }]);

    act(() => {
      const path: string = "data.bankAccounts";
      const next: unknown = [
        { bankName: "Citibank", bankAccountNumber: "222" },
      ];
      getForm().setValue(path, next);
    });

    await waitFor(() => {
      expect(result.current.options).toEqual([
        { label: "Citibank", value: "222" },
      ]);
    });
  });
});

describe("useSelectOptions — resolver", () => {
  it("reports loading then resolves an async resolver", async () => {
    let release: (opts: SelectOption[]) => void = () => undefined;
    testResolvers = {
      banks: () =>
        new Promise<SelectOption[]>((resolve) => {
          release = resolve;
        }),
    };
    const { result } = renderHook(
      () =>
        useSelectOptions(
          selectConfig({ type: "resolver", name: "banks" }),
          "field"
        ),
      { wrapper: Wrapper }
    );

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      release([{ label: "Async", value: "a" }]);
      // Flush the resolver promise's microtask within act.
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.options).toEqual([{ label: "Async", value: "a" }]);
  });

  it("resolves a sync resolver", async () => {
    testResolvers = { banks: () => [{ label: "Sync", value: "s" }] };
    const { result } = renderHook(
      () =>
        useSelectOptions(
          selectConfig({ type: "resolver", name: "banks" }),
          "field"
        ),
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(result.current.options).toEqual([{ label: "Sync", value: "s" }]);
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("warns and returns [] for an unknown resolver name", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    testResolvers = {};
    const { result } = renderHook(
      () =>
        useSelectOptions(
          selectConfig({ type: "resolver", name: "missing" }),
          "field"
        ),
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(result.current.options).toEqual([]);
    });
    expect(warn).toHaveBeenCalled();
  });
});

describe("useSelectOptions — backward compatibility", () => {
  it("returns no options (leaving optionsSource to the consumer) when options is absent", () => {
    const config: SelectFieldElement = {
      type: "select",
      name: "field",
      optionsSource: { type: "api", endpoint: "/api/x" },
    };
    const { result } = renderHook(() => useSelectOptions(config, "field"), {
      wrapper: Wrapper,
    });
    expect(result.current.options).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
