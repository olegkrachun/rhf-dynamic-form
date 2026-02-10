/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DynamicForm } from "../DynamicForm";
import { mockFieldComponents } from "../test-utils/mockFieldComponents";
import type {
  ComponentRegistry,
  ContainerComponent,
  FormConfiguration,
} from "../types";

describe("ContainerRenderer", () => {
  it("should render container with children", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          children: [
            { type: "text", name: "firstName", label: "First Name" },
            { type: "text", name: "lastName", label: "Last Name" },
          ],
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

    expect(screen.getByTestId("field-firstName")).toBeInTheDocument();
    expect(screen.getByTestId("field-lastName")).toBeInTheDocument();
    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
  });

  it("should render nested elements within container", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          children: [
            { type: "text", name: "name", label: "Name" },
            { type: "email", name: "email", label: "Email" },
            { type: "phone", name: "phone", label: "Phone" },
          ],
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

    expect(screen.getByTestId("field-name")).toBeInTheDocument();
    expect(screen.getByTestId("field-email")).toBeInTheDocument();
    expect(screen.getByTestId("field-phone")).toBeInTheDocument();
  });

  it("should use custom container component when provided", () => {
    const CustomContainer: ContainerComponent = ({ children }) => (
      <section className="custom-container" data-testid="custom-container">
        {children}
      </section>
    );

    const components: ComponentRegistry = {
      fields: mockFieldComponents,
      containers: { default: CustomContainer },
    };

    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          children: [{ type: "text", name: "field1", label: "Field 1" }],
        },
      ],
    };

    render(
      <DynamicForm components={components} config={config} onSubmit={vi.fn()} />
    );

    expect(screen.getByTestId("custom-container")).toBeInTheDocument();
    expect(screen.getByTestId("field-field1")).toBeInTheDocument();
  });

  it("should render mixed elements (fields and containers)", () => {
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "title", label: "Title" },
        {
          type: "container",
          children: [
            { type: "text", name: "firstName", label: "First Name" },
            { type: "text", name: "lastName", label: "Last Name" },
          ],
        },
        { type: "boolean", name: "accept", label: "Accept Terms" },
      ],
    };

    render(
      <DynamicForm
        components={{ fields: mockFieldComponents }}
        config={config}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByTestId("field-title")).toBeInTheDocument();
    expect(screen.getByTestId("field-firstName")).toBeInTheDocument();
    expect(screen.getByTestId("field-lastName")).toBeInTheDocument();
    expect(screen.getByTestId("field-accept")).toBeInTheDocument();
  });

  it("should render nested containers", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          children: [
            {
              type: "container",
              children: [
                {
                  type: "text",
                  name: "nested.field1",
                  label: "Nested Field 1",
                },
                {
                  type: "text",
                  name: "nested.field2",
                  label: "Nested Field 2",
                },
              ],
            },
          ],
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

    expect(screen.getByTestId("field-nested.field1")).toBeInTheDocument();
    expect(screen.getByTestId("field-nested.field2")).toBeInTheDocument();
  });
});
