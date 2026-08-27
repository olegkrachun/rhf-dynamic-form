/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ConfigurationError } from "../customComponents";
import { DynamicForm } from "../DynamicForm";
import { mockFieldComponents } from "../test-utils/mockFieldComponents";
import type {
  BaseFieldComponent,
  FallbackComponent,
  FieldWrapperFunction,
  FormConfiguration,
} from "../types";

describe("FieldRenderer", () => {
  describe("standard field rendering", () => {
    it("revalidates a conditional field when its controlling field changes", async () => {
      const ToggleField: BaseFieldComponent = ({ config, field }) => (
        <label>
          {config.label}
          <input
            checked={Boolean(field.value)}
            name={field.name}
            onBlur={field.onBlur}
            onChange={field.onChange}
            ref={field.ref}
            type="checkbox"
          />
        </label>
      );
      const DetailField: BaseFieldComponent = ({
        config,
        field,
        fieldState,
      }) => (
        <label>
          {config.label}
          <input {...field} />
          {fieldState.error ? (
            <span role="alert">{fieldState.error.message}</span>
          ) : null}
        </label>
      );
      const config: FormConfiguration = {
        elements: [
          { type: "boolean", name: "enabled", label: "Enabled" },
          {
            type: "text",
            name: "detail",
            label: "Detail",
            validation: {
              condition: {
                if: [{ var: "enabled" }, { "!!": { var: "detail" } }, true],
              },
              message: "Detail is required when enabled",
            },
          },
        ],
      };

      render(
        <DynamicForm
          components={{
            fields: { boolean: ToggleField, text: DetailField },
          }}
          config={config}
          initialData={{ enabled: false, detail: "" }}
          onSubmit={vi.fn()}
          validateOnMount
        />
      );
      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("Enabled"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Detail is required when enabled"
        );
      });

      fireEvent.click(screen.getByLabelText("Enabled"));

      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });

    it("does not propagate unrelated resolver state updates into field UI", async () => {
      const renderSpy = vi.fn();
      const TrackingField: BaseFieldComponent = ({
        config,
        field,
        fieldState,
      }) => {
        renderSpy(config.name);
        return (
          <label>
            {config.label}
            <input {...field} />
            {fieldState.error ? (
              <span role="alert">{fieldState.error.message}</span>
            ) : null}
          </label>
        );
      };
      const config: FormConfiguration = {
        elements: [
          {
            type: "text",
            name: "first",
            label: "First",
            validation: { minLength: 3, message: "Too short" },
          },
          { type: "text", name: "second", label: "Second" },
        ],
      };

      render(
        <DynamicForm
          components={{ fields: { text: TrackingField } }}
          config={config}
          initialData={{ first: "valid", second: "stable" }}
          onSubmit={vi.fn()}
          validateOnMount
        />
      );
      await waitFor(() => {
        expect(screen.getByLabelText("First")).toHaveValue("valid");
      });
      const unrelatedRendersBeforeChange = renderSpy.mock.calls.filter(
        ([name]) => name === "second"
      ).length;

      fireEvent.change(screen.getByLabelText("First"), {
        target: { value: "x" },
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      const unrelatedRendersAfterChange = renderSpy.mock.calls.filter(
        ([name]) => name === "second"
      ).length;
      expect(unrelatedRendersAfterChange).toBe(unrelatedRendersBeforeChange);
    });

    it("does not rerender an unrelated field whose existing error is unchanged", async () => {
      // arrange
      const renderSpy = vi.fn();
      const TrackingField: BaseFieldComponent = ({
        config,
        field,
        fieldState,
      }) => {
        renderSpy(config.name);
        return (
          <label>
            {config.label}
            <input {...field} />
            {fieldState.error ? (
              <span data-testid={`error-${config.name}`}>
                {fieldState.error.message}
              </span>
            ) : null}
          </label>
        );
      };
      const config: FormConfiguration = {
        elements: [
          {
            type: "text",
            name: "first",
            label: "First",
            validation: { minLength: 3, message: "First too short" },
          },
          {
            type: "text",
            name: "second",
            label: "Second",
            validation: { minLength: 3, message: "Second too short" },
          },
        ],
      };
      render(
        <DynamicForm
          components={{ fields: { text: TrackingField } }}
          config={config}
          initialData={{ first: "x", second: "x" }}
          onSubmit={vi.fn()}
          validateOnMount
        />
      );
      await waitFor(() => {
        expect(screen.getByTestId("error-second")).toBeInTheDocument();
      });
      const secondRendersBeforeChange = renderSpy.mock.calls.filter(
        ([name]) => name === "second"
      ).length;

      // act
      const firstInput = document.querySelector('input[name="first"]');
      expect(firstInput).not.toBeNull();
      if (!firstInput) {
        throw new Error("Expected first input to be rendered");
      }
      fireEvent.change(firstInput, {
        target: { value: "xx" },
      });
      await waitFor(() => {
        expect(screen.getByTestId("error-first")).toBeInTheDocument();
      });

      // assert
      const secondRendersAfterChange = renderSpy.mock.calls.filter(
        ([name]) => name === "second"
      ).length;
      expect(secondRendersAfterChange).toBe(secondRendersBeforeChange);
    });

    it("renders text field with label", async () => {
      const config: FormConfiguration = {
        elements: [{ type: "text", name: "username", label: "Username" }],
      };

      render(
        <DynamicForm
          components={{ fields: mockFieldComponents }}
          config={config}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("field-username")).toBeInTheDocument();
        expect(screen.getByLabelText("Username")).toBeInTheDocument();
      });
    });

    it("renders email field", async () => {
      const config: FormConfiguration = {
        elements: [{ type: "email", name: "email", label: "Email Address" }],
      };

      render(
        <DynamicForm
          components={{ fields: mockFieldComponents }}
          config={config}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("field-email")).toBeInTheDocument();
        expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      });
    });

    it("renders boolean field", async () => {
      const config: FormConfiguration = {
        elements: [{ type: "boolean", name: "agree", label: "I agree" }],
      };

      render(
        <DynamicForm
          components={{ fields: mockFieldComponents }}
          config={config}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("field-agree")).toBeInTheDocument();
      });
    });
  });

  describe("custom field rendering", () => {
    it("renders custom component with componentProps", async () => {
      interface RatingProps {
        maxStars: number;
      }
      const RatingField = ({
        componentProps,
      }: {
        componentProps: RatingProps;
      }) => (
        <div data-testid="custom-rating">Stars: {componentProps.maxStars}</div>
      );

      const config: FormConfiguration = {
        elements: [
          {
            type: "custom",
            name: "rating",
            component: "RatingField",
            componentProps: { maxStars: 5 },
          },
        ],
      };

      render(
        <DynamicForm
          components={{
            fields: mockFieldComponents,
            custom: { RatingField },
          }}
          config={config}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("custom-rating")).toBeInTheDocument();
        expect(screen.getByText("Stars: 5")).toBeInTheDocument();
      });
    });
  });

  describe("missing component fallback", () => {
    it("warns and renders nothing for missing field type without fallback", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {
        // Suppress expected warning for this test.
      });
      const config: FormConfiguration = {
        elements: [{ type: "currency", name: "amount", label: "Amount" }],
      };

      render(
        <DynamicForm
          components={{ fields: mockFieldComponents }}
          config={config}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId("fallback-amount")).not.toBeInTheDocument();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'No field component registered for type: "currency"'
          )
        );
      });

      consoleSpy.mockRestore();
    });

    it("renders field fallback for missing field type", async () => {
      const FieldFallback: FallbackComponent = ({
        config,
        field,
        missingComponent,
      }) => (
        <div data-testid={`fallback-${config.name}`}>
          <label htmlFor={field.name}>{config.label}</label>
          <input id={field.name} {...field} />
          <span data-testid="missing-component">
            {missingComponent.kind}:{missingComponent.requested}
          </span>
        </div>
      );
      const config: FormConfiguration = {
        elements: [{ type: "currency", name: "amount", label: "Amount" }],
      };

      render(
        <DynamicForm
          components={{
            fields: mockFieldComponents,
            fallback: { field: FieldFallback },
          }}
          config={config}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("fallback-amount")).toBeInTheDocument();
        expect(screen.getByLabelText("Amount")).toBeInTheDocument();
        expect(screen.getByTestId("missing-component")).toHaveTextContent(
          "field:currency"
        );
      });
    });

    it("uses field fallback before all fallback for missing field type", async () => {
      const AllFallback: FallbackComponent = ({ config }) => (
        <div data-testid={`fallback-${config.name}`}>all</div>
      );
      const FieldFallback: FallbackComponent = ({ config }) => (
        <div data-testid={`fallback-${config.name}`}>field</div>
      );
      const config: FormConfiguration = {
        elements: [{ type: "currency", name: "amount", label: "Amount" }],
      };

      render(
        <DynamicForm
          components={{
            fields: mockFieldComponents,
            fallback: { all: AllFallback, field: FieldFallback },
          }}
          config={config}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("fallback-amount")).toHaveTextContent(
          "field"
        );
      });
    });

    it("throws for missing custom component without fallback", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Suppress React error logging for expected render failure.
      });
      const config: FormConfiguration = {
        elements: [
          {
            type: "custom",
            name: "rating",
            component: "MissingRating",
          },
        ],
      };

      expect(() =>
        render(
          <DynamicForm
            components={{ fields: mockFieldComponents }}
            config={config}
            onSubmit={vi.fn()}
          />
        )
      ).toThrow(ConfigurationError);

      consoleSpy.mockRestore();
    });

    it("renders custom fallback for missing custom component with raw componentProps", async () => {
      const CustomFallback: FallbackComponent = ({
        componentProps,
        config,
        missingComponent,
      }) => (
        <div data-testid={`fallback-${config.name}`}>
          <span data-testid="missing-component">
            {missingComponent.kind}:{missingComponent.requested}
          </span>
          <span data-testid="component-props">
            {String(componentProps?.tone)}
          </span>
        </div>
      );
      const config: FormConfiguration = {
        elements: [
          {
            type: "custom",
            name: "rating",
            component: "MissingRating",
            componentProps: { tone: "blue" },
          },
        ],
      };

      render(
        <DynamicForm
          components={{
            fields: mockFieldComponents,
            fallback: { custom: CustomFallback },
          }}
          config={config}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("fallback-rating")).toBeInTheDocument();
        expect(screen.getByTestId("missing-component")).toHaveTextContent(
          "custom:MissingRating"
        );
        expect(screen.getByTestId("component-props")).toHaveTextContent("blue");
      });
    });

    it("passes undefined componentProps to custom fallback when omitted", async () => {
      const CustomFallback: FallbackComponent = ({
        componentProps,
        config,
      }) => (
        <div data-testid={`fallback-${config.name}`}>
          {String(componentProps === undefined)}
        </div>
      );
      const config: FormConfiguration = {
        elements: [
          {
            type: "custom",
            name: "rating",
            component: "MissingRating",
          },
        ],
      };

      render(
        <DynamicForm
          components={{
            fields: mockFieldComponents,
            fallback: { custom: CustomFallback },
          }}
          config={config}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("fallback-rating")).toHaveTextContent("true");
      });
    });

    it("renders all fallback for missing custom component", async () => {
      const AllFallback: FallbackComponent = ({ config, missingComponent }) => (
        <div data-testid={`fallback-${config.name}`}>
          {missingComponent.kind}:{missingComponent.requested}
        </div>
      );
      const config: FormConfiguration = {
        elements: [
          {
            type: "custom",
            name: "rating",
            component: "MissingRating",
          },
        ],
      };

      render(
        <DynamicForm
          components={{
            fields: mockFieldComponents,
            fallback: { all: AllFallback },
          }}
          config={config}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("fallback-rating")).toHaveTextContent(
          "custom:MissingRating"
        );
      });
    });

    it("still throws for invalid registered custom props when fallback exists", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Suppress React error logging for expected render failure.
      });
      const AllFallback: FallbackComponent = ({ config }) => (
        <div data-testid={`fallback-${config.name}`}>fallback</div>
      );
      const config: FormConfiguration = {
        elements: [
          {
            type: "custom",
            name: "rating",
            component: "RatingField",
            componentProps: { maxStars: 99 },
          },
        ],
      };

      expect(() =>
        render(
          <DynamicForm
            components={{
              fields: mockFieldComponents,
              custom: {
                RatingField: {
                  component: () => null,
                  propsSchema: z.object({
                    maxStars: z.number().int().min(1).max(10),
                  }),
                },
              },
              fallback: { all: AllFallback },
            }}
            config={config}
            onSubmit={vi.fn()}
          />
        )
      ).toThrow(ConfigurationError);

      consoleSpy.mockRestore();
    });

    it("wraps fallback output with fieldWrapper", async () => {
      const FieldFallback: FallbackComponent = ({ config }) => (
        <div data-testid={`fallback-${config.name}`}>fallback</div>
      );
      const fieldWrapper: FieldWrapperFunction = (props, children) => (
        <div data-testid={`wrapper-${props.name}`}>{children}</div>
      );
      const config: FormConfiguration = {
        elements: [{ type: "currency", name: "amount", label: "Amount" }],
      };

      render(
        <DynamicForm
          components={{
            fields: mockFieldComponents,
            fallback: { field: FieldFallback },
          }}
          config={config}
          fieldWrapper={fieldWrapper}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("wrapper-amount")).toBeInTheDocument();
        expect(screen.getByTestId("fallback-amount")).toBeInTheDocument();
      });
    });
  });

  describe("visibility", () => {
    it("hides field when visibility is false", async () => {
      const config: FormConfiguration = {
        elements: [
          {
            type: "text",
            name: "hidden",
            label: "Hidden Field",
            visible: { "===": [1, 0] }, // Always false
          },
        ],
      };

      render(
        <DynamicForm
          components={{ fields: mockFieldComponents }}
          config={config}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId("field-hidden")).not.toBeInTheDocument();
      });
    });

    it("shows field when visibility is true", async () => {
      const config: FormConfiguration = {
        elements: [
          {
            type: "text",
            name: "visible",
            label: "Visible Field",
            visible: { "===": [1, 1] }, // Always true
          },
        ],
      };

      render(
        <DynamicForm
          components={{ fields: mockFieldComponents }}
          config={config}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("field-visible")).toBeInTheDocument();
      });
    });
  });

  describe("field wrapper", () => {
    it("does not rerender an unrelated field wrapper", async () => {
      const config: FormConfiguration = {
        elements: [
          { type: "text", name: "first", label: "First" },
          { type: "text", name: "second", label: "Second" },
        ],
      };
      const wrapperCalls = new Map<string, number>();
      const fieldWrapper: FieldWrapperFunction = (props, children) => {
        wrapperCalls.set(props.name, (wrapperCalls.get(props.name) ?? 0) + 1);
        return <div data-testid={`wrapper-${props.name}`}>{children}</div>;
      };

      render(
        <DynamicForm
          components={{ fields: mockFieldComponents }}
          config={config}
          fieldWrapper={fieldWrapper}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("wrapper-second")).toBeInTheDocument();
      });
      const secondCallsBeforeChange = wrapperCalls.get("second");

      fireEvent.change(screen.getByLabelText("First"), {
        target: { value: "changed" },
      });

      await waitFor(() => {
        expect(screen.getByLabelText("First")).toHaveValue("changed");
      });
      expect(wrapperCalls.get("second")).toBe(secondCallsBeforeChange);
    });

    it("wraps field with custom wrapper", async () => {
      const config: FormConfiguration = {
        elements: [{ type: "text", name: "wrapped", label: "Wrapped Field" }],
      };

      const fieldWrapper: FieldWrapperFunction = (props, children) => (
        <div className="custom-wrapper" data-testid={`wrapper-${props.name}`}>
          {children}
        </div>
      );

      render(
        <DynamicForm
          components={{ fields: mockFieldComponents }}
          config={config}
          fieldWrapper={fieldWrapper}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("wrapper-wrapped")).toBeInTheDocument();
        expect(screen.getByTestId("field-wrapped")).toBeInTheDocument();
      });
    });

    it("passes field state to wrapper", async () => {
      const config: FormConfiguration = {
        elements: [{ type: "text", name: "stateful", label: "Stateful Field" }],
      };

      const fieldWrapper: FieldWrapperFunction = (props, children) => (
        <div data-testid={`wrapper-${props.name}`}>
          <span data-testid="wrapper-value">{String(props.value ?? "")}</span>
          {children}
        </div>
      );

      render(
        <DynamicForm
          components={{ fields: mockFieldComponents }}
          config={config}
          fieldWrapper={fieldWrapper}
          initialData={{ stateful: "test-value" }}
          onSubmit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("wrapper-stateful")).toBeInTheDocument();
        expect(screen.getByTestId("wrapper-value")).toHaveTextContent(
          "test-value"
        );
      });
    });
  });
});
