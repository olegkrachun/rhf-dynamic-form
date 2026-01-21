/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DynamicForm } from "../DynamicForm";
import { mockFieldComponents } from "../test-utils/mockFieldComponents";
import type { FormConfiguration } from "../types";

describe("ElementRenderer", () => {
  it("renders field elements via FieldRenderer", () => {
    const config: FormConfiguration = {
      elements: [{ type: "text", name: "username", label: "Username" }],
    };

    render(
      <DynamicForm
        config={config}
        fieldComponents={mockFieldComponents}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByTestId("field-username")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
  });

  it("renders container elements via ContainerRenderer", () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "100%",
              elements: [
                { type: "text", name: "nested", label: "Nested Field" },
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

    expect(screen.getByTestId("field-nested")).toBeInTheDocument();
  });

  it("handles all standard field types", () => {
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "text", label: "Text" },
        { type: "email", name: "email", label: "Email" },
        { type: "boolean", name: "bool", label: "Boolean" },
        { type: "phone", name: "phone", label: "Phone" },
        { type: "date", name: "date", label: "Date" },
        { type: "select", name: "sel", label: "Select", options: [] },
        {
          type: "array",
          name: "arr",
          label: "Array",
          itemFields: [{ type: "text", name: "item", label: "Item" }],
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

    expect(screen.getByTestId("field-text")).toBeInTheDocument();
    expect(screen.getByTestId("field-email")).toBeInTheDocument();
    expect(screen.getByTestId("field-bool")).toBeInTheDocument();
    expect(screen.getByTestId("field-phone")).toBeInTheDocument();
    expect(screen.getByTestId("field-date")).toBeInTheDocument();
    expect(screen.getByTestId("field-sel")).toBeInTheDocument();
    expect(screen.getByTestId("field-arr")).toBeInTheDocument();
  });

  it("renders multiple elements in order", () => {
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "first", label: "First" },
        { type: "email", name: "second", label: "Second" },
        { type: "boolean", name: "third", label: "Third" },
      ],
    };

    render(
      <DynamicForm
        config={config}
        fieldComponents={mockFieldComponents}
        onSubmit={vi.fn()}
      />
    );

    const first = screen.getByTestId("field-first");
    const second = screen.getByTestId("field-second");
    const third = screen.getByTestId("field-third");

    expect(first).toBeInTheDocument();
    expect(second).toBeInTheDocument();
    expect(third).toBeInTheDocument();

    // Verify DOM order
    expect(first.compareDocumentPosition(second)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(second.compareDocumentPosition(third)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });
});
