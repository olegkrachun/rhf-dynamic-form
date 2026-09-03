import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { DynamicForm } from "./DynamicForm";
import type {
  BaseFieldProps,
  ComponentRegistry,
  DynamicFormRef,
  FormConfiguration,
  FormElement,
} from "./types";

/**
 * Contract for dependent re-validation — the pass that re-checks the fields
 * whose `validation.condition` READS the value that just changed.
 *
 * The engine does this itself rather than through `rules.deps`, because RHF's
 * array trigger broadcasts without a field name and wakes every controller in
 * the form. Doing it by hand buys that isolation, but it also means the engine
 * owns error application — so the behaviour has to be pinned here, or the next
 * rewrite of that block silently changes what users see.
 *
 * Every test states the user-visible outcome, not the mechanism, so the block
 * can be reimplemented (one resolver pass + setError, or a named trigger per
 * dependent) without touching this file.
 */

const renderCounts = new Map<string, number>();

const Text = ({ field, fieldState }: BaseFieldProps) => {
  renderCounts.set(field.name, (renderCounts.get(field.name) ?? 0) + 1);
  return (
    <>
      <input
        data-testid={field.name}
        name={field.name}
        onBlur={field.onBlur}
        onChange={field.onChange}
        ref={field.ref}
        value={String(field.value ?? "")}
      />
      <span data-testid={`err:${field.name}`}>
        {fieldState?.error?.message ?? ""}
      </span>
    </>
  );
};

const components: ComponentRegistry = { fields: { text: Text } };

const field = (
  name: string,
  condition?: unknown,
  message?: string
): FormElement =>
  ({
    type: "text",
    name,
    label: name,
    meta: { visible: true },
    ...(condition ? { validation: { condition, message } } : {}),
  }) as unknown as FormElement;

/** `dependent*` fields are invalid exactly while `driver` reads "BAD". */
const buildConfig = (dependentCount: number): FormConfiguration => ({
  name: "dependents",
  elements: [
    field("driver"),
    ...Array.from({ length: dependentCount }, (_unused, index) =>
      field(
        `dependent${index}`,
        { if: [{ "==": [{ var: "driver" }, "BAD"] }, false, true] },
        `driver is BAD (${index})`
      )
    ),
  ],
});

const mount = async (dependentCount: number) => {
  renderCounts.clear();
  const ref = createRef<DynamicFormRef>();
  render(
    <DynamicForm
      components={components}
      config={buildConfig(dependentCount)}
      initialData={{
        driver: "",
        ...Object.fromEntries(
          Array.from({ length: dependentCount }, (_u, index) => [
            `dependent${index}`,
            "",
          ])
        ),
      }}
      mode="onChange"
      onSubmit={vi.fn()}
      ref={ref}
      validateOnMount
    />
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  return ref;
};

const type = async (value: string) => {
  fireEvent.change(screen.getByTestId("driver"), { target: { value } });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
};

const errorOf = (name: string) =>
  screen.getByTestId(`err:${name}`).textContent ?? "";

describe("Dependent re-validation contract", () => {
  it("raises the dependent's error when the driver turns it invalid", async () => {
    // arrange
    await mount(1);
    expect(errorOf("dependent0")).toBe("");

    // act
    await type("BAD");

    // assert
    expect(errorOf("dependent0")).toBe("driver is BAD (0)");
  });

  it("clears it again when the driver turns it valid", async () => {
    // arrange
    await mount(1);
    await type("BAD");
    expect(errorOf("dependent0")).toBe("driver is BAD (0)");

    // act
    await type("GOOD");

    // assert — a manually applied error must not outlive its condition
    expect(errorOf("dependent0")).toBe("");
  });

  it("survives a full round trip, so applied errors are not sticky", async () => {
    // arrange
    await mount(1);

    // act & assert — three flips in a row
    for (const [value, expected] of [
      ["BAD", "driver is BAD (0)"],
      ["GOOD", ""],
      ["BAD", "driver is BAD (0)"],
      ["", ""],
    ] as const) {
      await type(value);
      expect(errorOf("dependent0"), `after driver="${value}"`).toBe(expected);
    }
  });

  it("lands the verdict for the LAST value when edits arrive back to back", async () => {
    // arrange — no await between the two edits, so two dependent passes are
    // in flight at once. The later one must win regardless of which resolves
    // first, or the user sees the verdict for a value they already replaced.
    await mount(1);

    // act
    fireEvent.change(screen.getByTestId("driver"), {
      target: { value: "BAD" },
    });
    fireEvent.change(screen.getByTestId("driver"), {
      target: { value: "GOOD" },
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    // assert
    expect((screen.getByTestId("driver") as HTMLInputElement).value).toBe(
      "GOOD"
    );
    expect(errorOf("dependent0")).toBe("");
  });

  it("handles every dependent when one field drives many", async () => {
    // arrange — cover a large fan-out of dependents from one date field
    const count = 29;
    await mount(count);

    // act
    await type("BAD");

    // assert — no dependent is skipped
    for (let index = 0; index < count; index += 1) {
      expect(errorOf(`dependent${index}`), `dependent${index}`).toBe(
        `driver is BAD (${index})`
      );
    }
  });

  it("does not wake fields that no rule connects to the change", async () => {
    // arrange — one dependent, plus a bystander nothing reads
    renderCounts.clear();
    const ref = createRef<DynamicFormRef>();
    render(
      <DynamicForm
        components={components}
        config={{
          name: "bystander",
          elements: [
            field("driver"),
            field(
              "dependent0",
              { if: [{ "==": [{ var: "driver" }, "BAD"] }, false, true] },
              "driver is BAD (0)"
            ),
            field("bystander"),
          ],
        }}
        initialData={{ driver: "", dependent0: "", bystander: "" }}
        mode="onChange"
        onSubmit={vi.fn()}
        ref={ref}
        validateOnMount
      />
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    renderCounts.clear();

    // act
    await type("BAD");

    // assert — the dependent must re-render (its error appeared); the
    // bystander must not, or the targeted dispatch has regressed into a
    // form-wide broadcast
    expect(renderCounts.get("dependent0") ?? 0).toBeGreaterThan(0);
    expect(renderCounts.get("bystander") ?? 0).toBe(0);
  });
});
