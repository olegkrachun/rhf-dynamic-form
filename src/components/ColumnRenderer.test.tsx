/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DynamicForm } from "../DynamicForm";
import type { FieldComponentRegistry, FormConfiguration } from "../types";

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

describe("ColumnRenderer", () => {
  it("should render multiple fields within a single column", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "100%",
              elements: [
                { type: "text", name: "field1", label: "Field 1" },
                { type: "text", name: "field2", label: "Field 2" },
                { type: "text", name: "field3", label: "Field 3" },
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

    expect(screen.getByTestId("field-field1")).toBeInTheDocument();
    expect(screen.getByTestId("field-field2")).toBeInTheDocument();
    expect(screen.getByTestId("field-field3")).toBeInTheDocument();
  });

  it("should render columns with different widths", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "30%",
              elements: [{ type: "text", name: "narrow", label: "Narrow" }],
            },
            {
              type: "column",
              width: "70%",
              elements: [{ type: "text", name: "wide", label: "Wide" }],
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

    expect(screen.getByTestId("field-narrow")).toBeInTheDocument();
    expect(screen.getByTestId("field-wide")).toBeInTheDocument();
  });

  it("should render different field types within columns", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "50%",
              elements: [
                { type: "text", name: "name", label: "Name" },
                { type: "email", name: "email", label: "Email" },
              ],
            },
            {
              type: "column",
              width: "50%",
              elements: [
                { type: "phone", name: "phone", label: "Phone" },
                { type: "date", name: "date", label: "Date" },
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

    // First column
    expect(screen.getByTestId("field-name")).toBeInTheDocument();
    expect(screen.getByTestId("field-email")).toBeInTheDocument();

    // Second column
    expect(screen.getByTestId("field-phone")).toBeInTheDocument();
    expect(screen.getByTestId("field-date")).toBeInTheDocument();
  });

  it("should render nested containers within columns", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "100%",
              elements: [
                { type: "text", name: "outer", label: "Outer Field" },
                {
                  type: "container",
                  columns: [
                    {
                      type: "column",
                      width: "50%",
                      elements: [
                        {
                          type: "text",
                          name: "inner.left",
                          label: "Inner Left",
                        },
                      ],
                    },
                    {
                      type: "column",
                      width: "50%",
                      elements: [
                        {
                          type: "text",
                          name: "inner.right",
                          label: "Inner Right",
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

    expect(screen.getByTestId("field-outer")).toBeInTheDocument();
    expect(screen.getByTestId("field-inner.left")).toBeInTheDocument();
    expect(screen.getByTestId("field-inner.right")).toBeInTheDocument();
  });

  it("should support three-column layouts", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "33.33%",
              elements: [{ type: "text", name: "col1", label: "Column 1" }],
            },
            {
              type: "column",
              width: "33.33%",
              elements: [{ type: "text", name: "col2", label: "Column 2" }],
            },
            {
              type: "column",
              width: "33.33%",
              elements: [{ type: "text", name: "col3", label: "Column 3" }],
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

    expect(screen.getByTestId("field-col1")).toBeInTheDocument();
    expect(screen.getByTestId("field-col2")).toBeInTheDocument();
    expect(screen.getByTestId("field-col3")).toBeInTheDocument();
  });
});
