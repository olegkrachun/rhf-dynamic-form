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

describe("useSelectOptions — resolver reactivity via dependsOn", () => {
  it("re-runs the resolver when the dependsOn field changes", async () => {
    const byCustomer: Record<string, SelectOption[]> = {
      A: [{ label: "Acc-A", value: "a" }],
      B: [{ label: "Acc-B", value: "b" }],
    };
    testDefaults = { customerId: "A" };
    testResolvers = {
      accounts: ({ formValues }) =>
        byCustomer[formValues.customerId as string] ?? [],
    };
    const config: SelectFieldElement = {
      type: "select",
      name: "accounts",
      options: { type: "resolver", name: "accounts" },
      dependsOn: "customerId",
    };
    const { result } = renderHook(() => useSelectOptions(config, "accounts"), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.options).toEqual([{ label: "Acc-A", value: "a" }]);
    });

    act(() => {
      const path: string = "customerId";
      getForm().setValue(path, "B");
    });

    await waitFor(() => {
      expect(result.current.options).toEqual([{ label: "Acc-B", value: "b" }]);
    });
  });
});

describe("useSelectOptions — data-map nested reactivity", () => {
  it("recomputes when a nested leaf of the source array changes", async () => {
    testDefaults = { data: { accounts: [{ id: "1", name: "Old" }] } };
    const config = selectConfig({
      sourceField: "data.accounts",
      labelPath: "name",
      valuePath: "id",
    });
    const { result } = renderHook(() => useSelectOptions(config, "field"), {
      wrapper: Wrapper,
    });
    expect(result.current.options).toEqual([{ label: "Old", value: "1" }]);

    act(() => {
      const path: string = "data.accounts.0.name";
      getForm().setValue(path, "New");
    });

    await waitFor(() => {
      expect(result.current.options).toEqual([{ label: "New", value: "1" }]);
    });
  });
});

describe("useSelectOptions — resolver stale-guard and errors", () => {
  it("ignores a superseded slow resolver after the resolver name changes", async () => {
    const releasers: Record<string, (o: SelectOption[]) => void> = {};
    testResolvers = {
      slowA: () =>
        new Promise<SelectOption[]>((res) => {
          releasers.slowA = res;
        }),
      fastB: () =>
        new Promise<SelectOption[]>((res) => {
          releasers.fastB = res;
        }),
    };
    const { result, rerender } = renderHook(
      ({ name }: { name: string }) =>
        useSelectOptions(selectConfig({ type: "resolver", name }), "field"),
      { wrapper: Wrapper, initialProps: { name: "slowA" } }
    );
    expect(result.current.isLoading).toBe(true);

    rerender({ name: "fastB" });
    await act(async () => {
      releasers.fastB([{ label: "B", value: "b" }]);
      await Promise.resolve();
    });
    expect(result.current.options).toEqual([{ label: "B", value: "b" }]);

    // The superseded resolver resolving late must NOT clobber the current value.
    await act(async () => {
      releasers.slowA([{ label: "A", value: "a" }]);
      await Promise.resolve();
    });
    expect(result.current.options).toEqual([{ label: "B", value: "b" }]);
  });

  it("captures the error and clears loading when an async resolver rejects", async () => {
    let reject: (e: unknown) => void = () => undefined;
    testResolvers = {
      banks: () =>
        new Promise<SelectOption[]>((_, rej) => {
          reject = rej;
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
      reject(new Error("boom"));
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.options).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
