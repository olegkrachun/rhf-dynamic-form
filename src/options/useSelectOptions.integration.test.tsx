import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DynamicForm } from "../DynamicForm";
import type {
  BaseFieldComponent,
  ComponentRegistry,
  FormConfiguration,
  SelectFieldElement,
} from "../types";
import { useSelectOptions } from "./useSelectOptions";

// A minimal consumer select that resolves its options via the hook — exercises
// the full DynamicForm → context → useSelectOptions path end to end.
const HookSelect: BaseFieldComponent = ({ field, config }) => {
  const { options, isLoading } = useSelectOptions(
    config as SelectFieldElement,
    field.name
  );
  if (isLoading) {
    return <span>loading</span>;
  }
  return (
    <select
      aria-label={field.name}
      name={field.name}
      onBlur={field.onBlur}
      onChange={field.onChange}
      ref={field.ref}
      value={(field.value as string) ?? ""}
    >
      <option value="">--</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

const noop = () => undefined;

const renderForm = (
  config: FormConfiguration,
  components: ComponentRegistry,
  initialData?: Record<string, unknown>
) =>
  render(
    <DynamicForm
      components={components}
      config={config}
      initialData={initialData}
      onSubmit={noop}
    />
  );

describe("useSelectOptions — DynamicForm integration", () => {
  it("renders static options", () => {
    renderForm(
      {
        elements: [
          {
            type: "select",
            name: "bank",
            options: [
              { label: "Chase", value: "chase" },
              { label: "Citibank", value: "citi" },
            ],
          } as SelectFieldElement,
        ],
      },
      { fields: { select: HookSelect } }
    );

    expect(screen.getByRole("option", { name: "Chase" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Citibank" })).toBeDefined();
  });

  it("derives options from a data-map source in the form data", () => {
    renderForm(
      {
        elements: [
          {
            type: "select",
            name: "bank",
            options: {
              sourceField: "data.bankAccounts",
              labelPath: "bankName",
              valuePath: "bankAccountNumber",
            },
          } as SelectFieldElement,
        ],
      },
      { fields: { select: HookSelect } },
      {
        data: {
          bankAccounts: [
            { bankName: "Chase", bankAccountNumber: "111" },
            { bankName: "Citibank", bankAccountNumber: "222" },
          ],
        },
      }
    );

    expect(screen.getByRole("option", { name: "Chase" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Citibank" })).toBeDefined();
  });

  it("resolves options via a registered resolver", async () => {
    renderForm(
      {
        elements: [
          {
            type: "select",
            name: "bank",
            options: { type: "resolver", name: "bankAccountsResolver" },
          } as SelectFieldElement,
        ],
      },
      {
        fields: { select: HookSelect },
        resolvers: {
          bankAccountsResolver: () => [{ label: "Resolved Bank", value: "rb" }],
        },
      }
    );

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: "Resolved Bank" })
      ).toBeDefined();
    });
  });
});
