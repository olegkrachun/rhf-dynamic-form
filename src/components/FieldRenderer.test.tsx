/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ConfigurationError } from "../customComponents";
import { DynamicForm } from "../DynamicForm";
import { mockFieldComponents } from "../test-utils/mockFieldComponents";
import type {
  BaseFieldProps,
  ComponentRegistry,
  FallbackComponent,
  FieldWrapperFunction,
  FormConfiguration,
} from "../types";

describe("FieldRenderer", () => {
  it("does not subscribe every field to validation when dev tooling enumerates fieldState", async () => {
    const renderCounts = new Map<string, number>();
    let isValidatingDescriptor: PropertyDescriptor | undefined;
    let explicitIsValidating: boolean | undefined;
    const InspectingField = ({ field, fieldState, config }: BaseFieldProps) => {
      // React 19's development profiler performs this kind of recursive prop
      // inspection while recording component timings.
      Object.values(fieldState);
      if (field.name === "edited") {
        isValidatingDescriptor = Object.getOwnPropertyDescriptor(
          fieldState,
          "isValidating"
        );
        explicitIsValidating = fieldState.isValidating;
      }
      renderCounts.set(field.name, (renderCounts.get(field.name) ?? 0) + 1);
      return (
        <label>
          {config.label}
          <input
            aria-label={config.label}
            name={field.name}
            onBlur={field.onBlur}
            onChange={field.onChange}
            ref={field.ref}
            value={String(field.value ?? "")}
          />
          <span data-testid={`${field.name}-error`}>
            {fieldState.error?.message ?? ""}
          </span>
        </label>
      );
    };
    const components: ComponentRegistry = {
      fields: { text: InspectingField },
    };
    const config: FormConfiguration = {
      elements: [
        {
          type: "text",
          name: "edited",
          label: "Edited",
          validation: { required: true },
        },
        { type: "text", name: "peer", label: "Peer" },
      ],
    };

    render(
      <DynamicForm
        components={components}
        config={config}
        initialData={{ edited: "", peer: "unchanged" }}
        mode="onChange"
        onSubmit={vi.fn()}
        validateOnMount
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId("edited-error")).not.toHaveTextContent("");
    });
    renderCounts.clear();

    fireEvent.change(screen.getByLabelText("Edited"), {
      target: { value: "fixed" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("edited-error")).toHaveTextContent("");
    });

    expect(renderCounts.get("peer") ?? 0).toBe(0);
    expect(isValidatingDescriptor?.enumerable).toBe(false);
    expect(isValidatingDescriptor?.get).toEqual(expect.any(Function));
    expect(typeof explicitIsValidating).toBe("boolean");
  });

  describe("standard field rendering", () => {
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
