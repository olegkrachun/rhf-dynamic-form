/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DynamicForm } from "../DynamicForm";
import type {
  ContainerComponent,
  CustomContainerRegistry,
  FieldComponentRegistry,
  FormConfiguration,
} from "../types";

// Mock field components
const mockFieldComponents: FieldComponentRegistry = {
  text: ({ config, field }) => (
    <div data-testid={`field-${config.name}`}>
      <label htmlFor={field.name}>{config.label}</label>
      <input id={field.name} {...field} />
    </div>
  ),
  email: ({ config, field }) => (
    <div data-testid={`field-${config.name}`}>
      <label htmlFor={field.name}>{config.label}</label>
      <input id={field.name} type="email" {...field} />
    </div>
  ),
  boolean: ({ config, field }) => (
    <div data-testid={`field-${config.name}`}>
      <label>
        <input type="checkbox" {...field} />
        {config.label}
      </label>
    </div>
  ),
  phone: ({ config, field }) => (
    <div data-testid={`field-${config.name}`}>
      <label htmlFor={field.name}>{config.label}</label>
      <input id={field.name} type="tel" {...field} />
    </div>
  ),
  date: ({ config, field }) => (
    <div data-testid={`field-${config.name}`}>
      <label htmlFor={field.name}>{config.label}</label>
      <input id={field.name} type="date" {...field} />
    </div>
  ),
  select: ({ config, field }) => (
    <div data-testid={`field-${config.name}`}>
      <label htmlFor={field.name}>{config.label}</label>
      <select id={field.name} {...field}>
        {config.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
  array: ({ config }) => (
    <div data-testid={`field-${config.name}`}>
      <span>{config.label} (array)</span>
    </div>
  ),
};

describe("ContainerRenderer", () => {
  it("should render container with columns", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "50%",
              elements: [
                { type: "text", name: "firstName", label: "First Name" },
              ],
            },
            {
              type: "column",
              width: "50%",
              elements: [
                { type: "text", name: "lastName", label: "Last Name" },
              ],
            },
          ],
        },
      ],
    };

    render(
      <DynamicForm
        config={config}
        fieldComponents={mockFieldComponents}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByTestId("field-firstName")).toBeInTheDocument();
    expect(screen.getByTestId("field-lastName")).toBeInTheDocument();
    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
  });

  it("should render nested elements within columns", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "100%",
              elements: [
                { type: "text", name: "name", label: "Name" },
                { type: "email", name: "email", label: "Email" },
                { type: "phone", name: "phone", label: "Phone" },
              ],
            },
          ],
        },
      ],
    };

    render(
      <DynamicForm
        config={config}
        fieldComponents={mockFieldComponents}
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

    const customContainers: CustomContainerRegistry = {
      default: CustomContainer,
    };

    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "100%",
              elements: [{ type: "text", name: "field1", label: "Field 1" }],
            },
          ],
        },
      ],
    };

    render(
      <DynamicForm
        config={config}
        customContainers={customContainers}
        fieldComponents={mockFieldComponents}
        onSubmit={vi.fn()}
      />
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
          columns: [
            {
              type: "column",
              width: "50%",
              elements: [
                { type: "text", name: "firstName", label: "First Name" },
              ],
            },
            {
              type: "column",
              width: "50%",
              elements: [
                { type: "text", name: "lastName", label: "Last Name" },
              ],
            },
          ],
        },
        { type: "boolean", name: "accept", label: "Accept Terms" },
      ],
    };

    render(
      <DynamicForm
        config={config}
        fieldComponents={mockFieldComponents}
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
          columns: [
            {
              type: "column",
              width: "100%",
              elements: [
                {
                  type: "container",
                  columns: [
                    {
                      type: "column",
                      width: "50%",
                      elements: [
                        {
                          type: "text",
                          name: "nested.field1",
                          label: "Nested Field 1",
                        },
                      ],
                    },
                    {
                      type: "column",
                      width: "50%",
                      elements: [
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
            },
          ],
        },
      ],
    };

    render(
      <DynamicForm
        config={config}
        fieldComponents={mockFieldComponents}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByTestId("field-nested.field1")).toBeInTheDocument();
    expect(screen.getByTestId("field-nested.field2")).toBeInTheDocument();
  });
});
