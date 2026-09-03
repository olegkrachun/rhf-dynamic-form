/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { useFormState } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { ConfigurationError } from "./customComponents";
import { DynamicForm } from "./DynamicForm";
import { useDynamicFormContext } from "./hooks";
import { mockFieldComponents } from "./test-utils/mockFieldComponents";
import type {
  DynamicFormRef,
  FallbackComponent,
  FieldComponentRegistry,
  FormConfiguration,
} from "./types";

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

describe("DynamicForm | targeted cross-field validation", () => {
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

    // act 2 — uncheck No; the engine derives the reverse dependency from the
    // condition's `var` refs and re-validates `yes` by name. Without that
    // targeted pass `yes` would keep its stale error and the form would stay
    // invalid.
    fireEvent.click(noCheckbox);

    // assert 2 — peer field's stale error is cleared, form is valid again
    await waitFor(() => {
      const lastCall = onValidationChange.mock.calls.at(-1);
      expect(lastCall?.[1]).toBe(true);
    });
    expect(yesCheckbox.checked).toBe(true);
    expect(noCheckbox.checked).toBe(false);
  });

  it("does not schedule dependents when a field has no validation.condition", async () => {
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

  it("ignores self-references in the condition", async () => {
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

    // act — toggle the checkbox; a self-reference must not create a circular
    // dependent validation pass
    fireEvent.click(checkbox);

    // assert
    await waitFor(() => {
      expect(checkbox.checked).toBe(true);
    });
  });
});

describe("DynamicForm | validateOnMount", () => {
  const emailConfig: FormConfiguration = {
    elements: [
      {
        type: "email",
        name: "contactEmail",
        label: "Email",
      },
    ],
  };

  it("surfaces invalid initialData immediately when validateOnMount is true", async () => {
    // arrange
    const onValidationChange = vi.fn();
    render(
      <DynamicForm
        components={{ fields: mockFieldComponents }}
        config={emailConfig}
        initialData={{ contactEmail: "not-an-email" }}
        onSubmit={vi.fn()}
        onValidationChange={onValidationChange}
        validateOnMount
      />
    );

    // assert — validation runs once on mount and the form is invalid
    await waitFor(() => {
      const lastCall = onValidationChange.mock.calls.at(-1);
      expect(lastCall?.[1]).toBe(false);
    });
  });
});

describe("DynamicForm | missing component fallback", () => {
  const missingCustomConfig: FormConfiguration = {
    elements: [
      {
        type: "custom",
        name: "rating",
        component: "MissingRating",
      },
    ],
  };

  it("keeps custom component validation strict when only field fallback is configured", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Suppress React error logging for expected render failure.
    });
    const FieldFallback: FallbackComponent = ({ config }) => (
      <div data-testid={`fallback-${config.name}`}>fallback</div>
    );

    expect(() =>
      render(
        <DynamicForm
          components={{
            fields: mockFieldComponents,
            fallback: { field: FieldFallback },
          }}
          config={missingCustomConfig}
          onSubmit={vi.fn()}
        />
      )
    ).toThrow(ConfigurationError);

    consoleSpy.mockRestore();
  });

  it("allows missing custom components when custom fallback is configured", async () => {
    const CustomFallback: FallbackComponent = ({
      config,
      missingComponent,
    }) => (
      <div data-testid={`fallback-${config.name}`}>
        {missingComponent.kind}:{missingComponent.requested}
      </div>
    );

    render(
      <DynamicForm
        components={{
          fields: mockFieldComponents,
          fallback: { custom: CustomFallback },
        }}
        config={missingCustomConfig}
        onSubmit={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("fallback-rating")).toHaveTextContent(
        "custom:MissingRating"
      );
    });
  });
});

describe("DynamicForm | form context data access", () => {
  const emailConfig: FormConfiguration = {
    elements: [
      {
        type: "email",
        name: "contactEmail",
        label: "Email",
        validation: { required: true },
      },
    ],
  };

  it("keeps the public context form state reactive", async () => {
    // arrange
    const ContextProbe = () => {
      const { errors, isValid } = useDynamicFormContext();
      return (
        <output data-testid="context-form-state">
          {isValid ? "valid" : "invalid"}:{Object.keys(errors).length}
        </output>
      );
    };

    render(
      <DynamicForm
        components={{ fields: mockFieldComponents }}
        config={emailConfig}
        initialData={{ contactEmail: "" }}
        mode="onChange"
        onSubmit={vi.fn()}
        validateOnMount
      >
        <ContextProbe />
      </DynamicForm>
    );
    await waitFor(() => {
      expect(screen.getByTestId("context-form-state")).toHaveTextContent(
        "invalid:1"
      );
    });

    // act
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });

    // assert — the existing context API updates without an extra subscription.
    await waitFor(() => {
      expect(screen.getByTestId("context-form-state")).toHaveTextContent(
        "valid:0"
      );
    });
  });

  it("keeps useFormState reactive for context consumers", async () => {
    // arrange
    const FormStateProbe = () => {
      const { form } = useDynamicFormContext();
      const { errors, isDirty } = useFormState({ control: form.control });
      return (
        <output data-testid="form-state">
          {isDirty ? "dirty" : "pristine"}:{Object.keys(errors).length}
        </output>
      );
    };

    render(
      <DynamicForm
        components={{ fields: mockFieldComponents }}
        config={emailConfig}
        initialData={{ contactEmail: "" }}
        mode="onChange"
        onSubmit={vi.fn()}
        validateOnMount
      >
        <FormStateProbe />
      </DynamicForm>
    );
    await waitFor(() => {
      expect(screen.getByTestId("form-state")).toHaveTextContent("pristine:1");
    });

    // act
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });

    // assert — consumers can keep using the existing RHF form-state API.
    await waitFor(() => {
      expect(screen.getByTestId("form-state")).toHaveTextContent("dirty:0");
    });
  });

  describe("getIsDirty", () => {
    it("keeps all ref snapshots in sync", async () => {
      // arrange
      const onValidationChange = vi.fn();
      const formRef = createRef<DynamicFormRef>();
      render(
        <DynamicForm
          components={{ fields: mockFieldComponents }}
          config={emailConfig}
          initialData={{ contactEmail: "start@example.com" }}
          mode="onChange"
          onSubmit={vi.fn()}
          onValidationChange={onValidationChange}
          ref={formRef}
          validateOnMount
        />
      );

      await waitFor(() => {
        expect(formRef.current?.getIsDirty()).toBe(false);
        expect(formRef.current?.getIsValid()).toBe(true);
        expect(formRef.current?.getErrors()).toEqual({});
      });

      // act
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "" },
      });

      // assert
      await waitFor(() => {
        expect(formRef.current?.getIsDirty()).toBe(true);
        expect(formRef.current?.getIsValid()).toBe(false);
        expect(formRef.current?.getErrors()).toHaveProperty("contactEmail");
        expect(formRef.current?.getDirtyFields()).toEqual({
          contactEmail: true,
        });
      });

      // act — reverting to the default must restore pristine state.
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "start@example.com" },
      });

      // assert
      await waitFor(() => {
        expect(formRef.current?.getIsDirty()).toBe(false);
        expect(formRef.current?.getIsValid()).toBe(true);
        expect(formRef.current?.getErrors()).toEqual({});
        expect(formRef.current?.getDirtyFields()).toEqual({});
      });
    });
  });
});
