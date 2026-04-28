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

describe("DynamicForm | cross-field validation re-trigger", () => {
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

    // act 2 — uncheck No; without the form-wide trigger, the peer (`yes`)
    // would keep its stale error and the form would stay invalid
    fireEvent.click(noCheckbox);

    // assert 2 — peer field's stale error is cleared, form is valid again
    await waitFor(() => {
      const lastCall = onValidationChange.mock.calls.at(-1);
      expect(lastCall?.[1]).toBe(true);
    });
    expect(yesCheckbox.checked).toBe(true);
    expect(noCheckbox.checked).toBe(false);
  });

  it("does not run form-wide trigger when no field declares validation.condition", async () => {
    // arrange — plain form, no cross-field rules
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "username", label: "Username" },
        { type: "boolean", name: "agree", label: "I agree" },
      ],
    };
    const onValidationChange = vi.fn();
    render(
      <DynamicForm
        components={{ fields: checkboxFields }}
        config={config}
        onSubmit={vi.fn()}
        onValidationChange={onValidationChange}
      />
    );
    const initialCallCount = onValidationChange.mock.calls.length;
    const usernameInput = screen.getByLabelText("Username");

    // act — change a field; without any condition, the form-wide trigger
    // path is skipped, so validation does not cascade
    fireEvent.change(usernameInput, { target: { value: "alice" } });

    // assert — at most one extra call (RHF's own per-field validation),
    // not the cascade that cross-field re-trigger would produce
    await waitFor(() => {
      expect(
        onValidationChange.mock.calls.length - initialCallCount
      ).toBeLessThanOrEqual(1);
    });
  });
});
