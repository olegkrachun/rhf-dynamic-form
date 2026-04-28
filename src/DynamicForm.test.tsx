/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DynamicForm } from "./DynamicForm";
import { mockFieldComponents } from "./test-utils/mockFieldComponents";
import type { FieldComponentRegistry, FormConfiguration } from "./types";

// The shared `mockFieldComponents.boolean` spreads `{...field}` onto the
// input, which doesn't bind `checked` correctly for checkbox semantics. For
// integration tests that rely on toggling boolean state through user events
// we need a properly wired checkbox.
const checkboxFields: FieldComponentRegistry = {
  ...mockFieldComponents,
  boolean: ({ config, field }) => (
    <div data-testid={`field-${config.name}`}>
      <label>
        <input
          checked={Boolean(field.value)}
          name={field.name}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(event.target.checked)}
          ref={field.ref}
          type="checkbox"
        />
        {config.label}
      </label>
    </div>
  ),
};

describe("DynamicForm | cross-field validation via rules.deps", () => {
  const buildPairConfig = (): FormConfiguration => ({
    elements: [
      {
        type: "boolean",
        name: "yes",
        label: "Yes",
        validation: {
          condition: { "!": { and: [{ var: "yes" }, { var: "no" }] } },
          message: "Mutually exclusive",
        },
      },
      {
        type: "boolean",
        name: "no",
        label: "No",
        validation: {
          condition: { "!": { and: [{ var: "yes" }, { var: "no" }] } },
          message: "Mutually exclusive",
        },
      },
    ],
  });

  it("re-validates peer fields after a conflicting peer is unchecked", async () => {
    // arrange
    const onValidationChange = vi.fn();
    render(
      <DynamicForm
        components={{ fields: checkboxFields }}
        config={buildPairConfig()}
        initialData={{ yes: false, no: false }}
        mode="all"
        onSubmit={vi.fn()}
        onValidationChange={onValidationChange}
      />
    );
    const yesCheckbox = screen.getByLabelText("Yes") as HTMLInputElement;
    const noCheckbox = screen.getByLabelText("No") as HTMLInputElement;

    // act 1 — trigger the conflict: both checked → mutual exclusion fails
    fireEvent.click(yesCheckbox);
    fireEvent.click(noCheckbox);

    // assert 1 — the form is invalid while both are checked
    await waitFor(() => {
      const lastCall = onValidationChange.mock.calls.at(-1);
      expect(lastCall?.[1]).toBe(false);
    });

    // act 2 — uncheck No; the engine derives `deps: ['yes']` from the
    // condition's `var` refs and forwards them to RHF, so changing `no`
    // automatically re-validates `yes`. Without that wiring `yes` would
    // keep its stale error and the form would stay invalid.
    fireEvent.click(noCheckbox);

    // assert 2 — peer field's stale error is cleared, form is valid again
    await waitFor(() => {
      const lastCall = onValidationChange.mock.calls.at(-1);
      expect(lastCall?.[1]).toBe(true);
    });
    expect(yesCheckbox.checked).toBe(true);
    expect(noCheckbox.checked).toBe(false);
  });

  it("does not wire deps when a field has no validation.condition", async () => {
    // arrange — plain form, no cross-field rules; just sanity-check that
    // the engine doesn't crash and validation still runs per-field.
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "username", label: "Username" },
        { type: "boolean", name: "agree", label: "I agree" },
      ],
    };
    render(
      <DynamicForm
        components={{ fields: checkboxFields }}
        config={config}
        onSubmit={vi.fn()}
      />
    );
    const usernameInput = screen.getByLabelText("Username");

    // act
    fireEvent.change(usernameInput, { target: { value: "alice" } });

    // assert — change applied without throwing
    await waitFor(() => {
      expect((usernameInput as HTMLInputElement).value).toBe("alice");
    });
  });

  it("ignores self-references in the condition (does not wire a field as its own dep)", async () => {
    // arrange — single field whose condition refers only to itself
    const config: FormConfiguration = {
      elements: [
        {
          type: "boolean",
          name: "acceptTerms",
          label: "I accept",
          validation: {
            condition: { var: "acceptTerms" },
            message: "You must accept",
          },
        },
      ],
    };
    render(
      <DynamicForm
        components={{ fields: checkboxFields }}
        config={config}
        onSubmit={vi.fn()}
      />
    );
    const checkbox = screen.getByLabelText("I accept") as HTMLInputElement;

    // act — toggle the checkbox; with self filtered out of `deps`, RHF
    // should not crash with a circular self-reference
    fireEvent.click(checkbox);

    // assert
    await waitFor(() => {
      expect(checkbox.checked).toBe(true);
    });
  });
});
