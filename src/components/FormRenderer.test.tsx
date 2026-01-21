/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DynamicForm } from "../DynamicForm";
import { mockFieldComponents } from "../test-utils/mockFieldComponents";
import type { FormConfiguration } from "../types";

describe("FormRenderer", () => {
  it("renders single element", () => {
    const config: FormConfiguration = {
      elements: [{ type: "text", name: "single", label: "Single Field" }],
    };

    render(
      <DynamicForm
        config={config}
        fieldComponents={mockFieldComponents}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByTestId("field-single")).toBeInTheDocument();
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

    // Verify order by checking DOM position
    expect(first.compareDocumentPosition(second)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(second.compareDocumentPosition(third)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it("renders mixed fields and containers", () => {
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "topField", label: "Top Field" },
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "50%",
              elements: [
                { type: "text", name: "leftField", label: "Left Field" },
              ],
            },
            {
              type: "column",
              width: "50%",
              elements: [
                { type: "text", name: "rightField", label: "Right Field" },
              ],
            },
          ],
        },
        { type: "email", name: "bottomField", label: "Bottom Field" },
      ],
    };

    render(
      <DynamicForm
        config={config}
        fieldComponents={mockFieldComponents}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByTestId("field-topField")).toBeInTheDocument();
    expect(screen.getByTestId("field-leftField")).toBeInTheDocument();
    expect(screen.getByTestId("field-rightField")).toBeInTheDocument();
    expect(screen.getByTestId("field-bottomField")).toBeInTheDocument();
  });

  it("uses field name as key for field elements", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Suppress console output during test
    });

    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "field1", label: "Field 1" },
        { type: "text", name: "field2", label: "Field 2" },
      ],
    };

    render(
      <DynamicForm
        config={config}
        fieldComponents={mockFieldComponents}
        onSubmit={vi.fn()}
      />
    );

    // Verify no React key warnings were emitted
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("key"),
      expect.anything(),
      expect.anything()
    );
    expect(screen.getByTestId("field-field1")).toBeInTheDocument();
    expect(screen.getByTestId("field-field2")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("renders nested paths correctly", () => {
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "user.firstName", label: "First Name" },
        { type: "text", name: "user.lastName", label: "Last Name" },
        { type: "email", name: "user.contact.email", label: "Email" },
      ],
    };

    render(
      <DynamicForm
        config={config}
        fieldComponents={mockFieldComponents}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByTestId("field-user.firstName")).toBeInTheDocument();
    expect(screen.getByTestId("field-user.lastName")).toBeInTheDocument();
    expect(screen.getByTestId("field-user.contact.email")).toBeInTheDocument();
  });
});
