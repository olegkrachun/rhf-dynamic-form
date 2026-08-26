/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, useEffect, useRef } from "react";
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
  describe("getIsDirty", () => {
    const emailConfig: FormConfiguration = {
      elements: [
        {
          type: "email",
          name: "contactEmail",
          label: "Email",
        },
      ],
    };

    it("returns true if the form is dirty", async () => {
      // arrange
      const onValidationChange = vi.fn();
      const formRef = createRef<DynamicFormRef>();
      render(
        <DynamicForm
          components={{ fields: mockFieldComponents }}
          config={emailConfig}
          initialData={{ contactEmail: "not-an-email" }}
          onSubmit={vi.fn()}
          onValidationChange={onValidationChange}
          ref={formRef}
          validateOnMount
        />
      );

      await waitFor(() => {
        expect(formRef.current?.getIsDirty()).toBe(false);
      });

      // act
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "test@example.com" },
      });

      // assert
      await waitFor(() => {
        expect(formRef.current?.getIsDirty()).toBe(true);
      });
    });
  });
});

describe("DynamicForm | pull-based validation access", () => {
  const emailOnlyConfig: FormConfiguration = {
    elements: [
      {
        type: "email",
        name: "contactEmail",
        label: "Email",
        validation: { message: "Invalid email" },
      },
    ],
  };

  const ValidationProbe = ({
    onRender,
    onNotify,
  }: {
    onRender: (snapshot: { isValid: boolean; fieldError: unknown }) => void;
    onNotify: () => void;
  }) => {
    const { validation } = useDynamicFormContext();
    const notifyRef = useRef(onNotify);
    notifyRef.current = onNotify;

    onRender({
      isValid: validation.getIsValid(),
      fieldError: validation.getFieldError("contactEmail"),
    });

    useEffect(
      () => validation.subscribe(() => notifyRef.current()),
      [validation]
    );

    return null;
  };

  it("reports the current field error without re-rendering the consumer", async () => {
    // arrange
    const onRender = vi.fn();
    const onNotify = vi.fn();

    render(
      <DynamicForm
        components={{ fields: mockFieldComponents }}
        config={emailOnlyConfig}
        initialData={{ contactEmail: "not-an-email" }}
        onSubmit={vi.fn()}
        validateOnMount
      >
        <ValidationProbe onNotify={onNotify} onRender={onRender} />
      </DynamicForm>
    );

    await waitFor(() => {
      expect(onNotify).toHaveBeenCalled();
    });

    const rendersAfterMount = onRender.mock.calls.length;

    // act
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });

    // assert — the validation pass reaches the subscriber, not the renderer
    await waitFor(() => {
      expect(onNotify.mock.calls.length).toBeGreaterThan(1);
    });
    expect(onRender.mock.calls.length).toBe(rendersAfterMount);
  });

  it("exposes the error for an invalid field and clears it once fixed", async () => {
    // arrange
    const snapshots: { isValid: boolean; fieldError: unknown }[] = [];
    const notify = vi.fn();
    const ref = createRef<DynamicFormRef>();

    render(
      <DynamicForm
        components={{ fields: mockFieldComponents }}
        config={emailOnlyConfig}
        initialData={{ contactEmail: "not-an-email" }}
        onSubmit={vi.fn()}
        ref={ref}
        validateOnMount
      >
        <ValidationProbe
          onNotify={notify}
          onRender={(snapshot) => snapshots.push(snapshot)}
        />
      </DynamicForm>
    );

    // assert — invalid initial data is readable through the accessors
    await waitFor(() => {
      expect(ref.current?.getIsValid()).toBe(false);
    });
    expect(ref.current?.getErrors()).toHaveProperty("contactEmail");

    // act
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });

    // assert
    await waitFor(() => {
      expect(ref.current?.getIsValid()).toBe(true);
    });
    expect(ref.current?.getErrors()).not.toHaveProperty("contactEmail");
    expect(snapshots.length).toBeGreaterThan(0);
  });
});

describe("DynamicForm | manual errors set by children on mount", () => {
  const emailConfig: FormConfiguration = {
    elements: [{ type: "text", name: "contactEmail", label: "Email" }],
  };

  const MountErrorSetter = () => {
    const { form } = useDynamicFormContext();

    useEffect(() => {
      form.setError("contactEmail", {
        type: "manual-gate",
        message: "Set before any form interaction",
      });
    }, [form]);

    return null;
  };

  it("exposes a child's mount-time setError through getErrors and onValidationChange", async () => {
    // arrange — a child effect runs before the parent's passive effects, so
    // this reproduces a gate stamping an error before any subscription set up
    // in a passive effect would exist
    const onValidationChange = vi.fn();
    const ref = createRef<DynamicFormRef>();

    // act
    render(
      <DynamicForm
        components={{ fields: mockFieldComponents }}
        config={emailConfig}
        initialData={{ contactEmail: "someone@example.com" }}
        onSubmit={vi.fn()}
        onValidationChange={onValidationChange}
        ref={ref}
      >
        <MountErrorSetter />
      </DynamicForm>
    );

    // assert — the snapshot sees the manual error
    await waitFor(() => {
      expect(ref.current?.getErrors()).toHaveProperty("contactEmail");
    });
    const lastCall = onValidationChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toHaveProperty("contactEmail");
  });

  it("does not notify validation listeners for dirty-only changes", async () => {
    // arrange
    const notify = vi.fn();
    const ref = createRef<DynamicFormRef>();

    const DirtyProbe = () => {
      const { validation } = useDynamicFormContext();
      useEffect(() => validation.subscribe(notify), [validation]);
      return null;
    };

    render(
      <DynamicForm
        components={{ fields: mockFieldComponents }}
        config={emailConfig}
        initialData={{ contactEmail: "someone@example.com" }}
        mode="onSubmit"
        onSubmit={vi.fn()}
        ref={ref}
      >
        <DirtyProbe />
      </DynamicForm>
    );
    // First edit legitimately notifies: isValid is computed for the first
    // time. Settle it, then measure a dirty-only transition.
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "typed@example.com" },
    });
    await waitFor(() => {
      expect(ref.current?.getIsDirty()).toBe(true);
    });
    const before = notify.mock.calls.length;

    // act — revert to the default value: only isDirty/dirtyFields change,
    // validity stays exactly as it was
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "someone@example.com" },
    });

    // assert — dirty state is tracked, validation listeners stay quiet
    await waitFor(() => {
      expect(ref.current?.getIsDirty()).toBe(false);
    });
    expect(notify.mock.calls.length).toBe(before);
  });
});
