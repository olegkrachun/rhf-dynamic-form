/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen } from "@testing-library/react";
import type {
  Control,
  ControllerFieldState,
  UseFormReturn,
} from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type {
  BaseFieldComponent,
  ComponentRegistry,
  CustomFieldElement,
  FallbackComponent,
  FieldElement,
  FieldWrapperFunction,
  FormData,
} from "../types";
import {
  FieldPresentation,
  type FieldPresentationProps,
} from "./FieldPresentation";

const createProps = (
  overrides: Partial<FieldPresentationProps> = {}
): FieldPresentationProps => {
  const field = {
    name: "profile.name",
    value: "Ada",
    onBlur: vi.fn(),
    onChange: vi.fn(),
    ref: vi.fn(),
  } as FieldPresentationProps["field"];
  const fieldState: ControllerFieldState = {
    error: undefined,
    invalid: false,
    isDirty: false,
    isTouched: false,
    isValidating: false,
  };
  const StandardField: BaseFieldComponent = ({
    config,
    field: currentField,
  }) => (
    <label>
      {config.label}
      <input {...currentField} />
    </label>
  );

  return {
    components: { fields: { text: StandardField } },
    config: { type: "text", name: "profile.name", label: "Name" },
    control: {} as Control<FormData>,
    field,
    fieldState,
    getFieldState: vi.fn() as UseFormReturn<FormData>["getFieldState"],
    getValues: vi.fn(() => ({ profile: { name: "Ada" } })),
    setValue: vi.fn(),
    ...overrides,
  };
};

describe("FieldPresentation", () => {
  it("renders a registered standard field with current form accessors", () => {
    // arrange
    const fieldSpy = vi.fn();
    const StandardField: BaseFieldComponent = (props) => {
      fieldSpy(props);
      return (
        <button
          onClick={() => props.setValue("profile.name", "Grace")}
          type="button"
        >
          {props.config.label}
        </button>
      );
    };
    const props = createProps({
      components: { fields: { text: StandardField } },
    });

    // act
    render(<FieldPresentation {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Name" }));

    // assert
    expect(fieldSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        config: props.config,
        field: props.field,
        fieldState: props.fieldState,
        formValues: { profile: { name: "Ada" } },
        setValue: props.setValue,
      })
    );
    expect(props.getValues).toHaveBeenCalledTimes(1);
    expect(props.setValue).toHaveBeenCalledWith("profile.name", "Grace");
  });

  it("renders a registered custom component with its component props", () => {
    // arrange
    const customSpy = vi.fn();
    const CustomField = (props: Record<string, unknown>) => {
      customSpy(props);
      return <div>Custom rating</div>;
    };
    const config: CustomFieldElement = {
      type: "custom",
      name: "rating",
      label: "Rating",
      component: "RatingField",
      componentProps: { maximum: 5 },
    };
    const props = createProps({
      components: {
        fields: {},
        custom: { RatingField: CustomField },
      },
      config,
    });

    // act
    render(<FieldPresentation {...props} />);

    // assert
    expect(screen.getByText("Custom rating")).toBeInTheDocument();
    expect(customSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        componentProps: { maximum: 5 },
        config,
        formValues: { profile: { name: "Ada" } },
      })
    );
  });

  it.each([
    {
      config: {
        type: "unknown",
        name: "missing",
        label: "Missing",
      } as FieldElement,
      components: { fields: {} } as ComponentRegistry,
      expectedKind: "field",
      expectedRequested: "unknown",
      expectedProps: undefined,
    },
    {
      config: {
        type: "custom",
        name: "missingCustom",
        label: "Missing custom",
        component: "AbsentComponent",
        componentProps: { tone: "warning" },
      } as CustomFieldElement,
      components: { fields: {}, custom: {} } as ComponentRegistry,
      expectedKind: "custom",
      expectedRequested: "AbsentComponent",
      expectedProps: { tone: "warning" },
    },
  ])(
    "renders fallback metadata for a missing $expectedKind component",
    ({
      config,
      components,
      expectedKind,
      expectedRequested,
      expectedProps,
    }) => {
      // arrange
      const fallbackSpy = vi.fn();
      const Fallback: FallbackComponent = (props) => {
        fallbackSpy(props);
        return <div>Fallback</div>;
      };
      const props = createProps({
        components: { ...components, fallback: { all: Fallback } },
        config,
      });

      // act
      render(<FieldPresentation {...props} />);

      // assert
      expect(screen.getByText("Fallback")).toBeInTheDocument();
      expect(fallbackSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          componentProps: expectedProps,
          missingComponent: {
            kind: expectedKind,
            requested: expectedRequested,
          },
        })
      );
    }
  );

  it("warns and renders nothing when no component or fallback is registered", () => {
    // arrange
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const props = createProps({
      components: { fields: {} },
      config: {
        type: "unknown",
        name: "missing",
        label: "Missing",
      } as FieldElement,
    });

    // act
    const { container } = render(<FieldPresentation {...props} />);

    // assert
    expect(container).toBeEmptyDOMElement();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'No field component registered for type: "unknown"'
      )
    );
    warnSpy.mockRestore();
  });

  it("passes stable RHF accessors and the rendered field through the wrapper", () => {
    // arrange
    const wrapperSpy = vi.fn();
    const fieldWrapper: FieldWrapperFunction = (wrapperProps, children) => {
      wrapperSpy(wrapperProps);
      return <section aria-label="wrapper">{children}</section>;
    };
    const props = createProps({ fieldWrapper });

    // act
    render(<FieldPresentation {...props} />);

    // assert
    expect(screen.getByRole("region", { name: "wrapper" })).toContainElement(
      screen.getByLabelText("Name")
    );
    expect(wrapperSpy).toHaveBeenCalledWith({
      control: props.control,
      name: "profile.name",
      config: props.config,
      fieldState: props.fieldState,
      getFieldState: props.getFieldState,
      getValues: props.getValues,
      value: "Ada",
      formValues: { profile: { name: "Ada" } },
      setValue: props.setValue,
    });
  });
});
