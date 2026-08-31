/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import reviewPipelineFixture from "../../sample/reviewPipelineFixture.json";
import { DynamicForm } from "../DynamicForm";
import type {
  BaseFieldComponent,
  ComponentRegistry,
  FormConfiguration,
  FormData,
} from "../types";

const camelizeKey = (key: string) =>
  key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

const camelizeDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(camelizeDeep);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      camelizeKey(key),
      camelizeDeep(nestedValue),
    ])
  );
};

describe("Review pipeline rendering", () => {
  it("does not rerender unrelated fields while typing in the real form", async () => {
    // arrange
    const renderSpy = vi.fn();
    const TrackingField: BaseFieldComponent = ({ config, field }) => {
      renderSpy(config.name);
      if (config.type === "array") {
        return null;
      }
      if (config.type === "checkbox") {
        return (
          <input
            checked={Boolean(field.value)}
            name={field.name}
            onBlur={field.onBlur}
            onChange={field.onChange}
            ref={field.ref}
            type="checkbox"
          />
        );
      }
      return <input {...field} value={String(field.value ?? "")} />;
    };
    const components: ComponentRegistry = {
      fields: {
        array: TrackingField,
        checkbox: TrackingField,
        date: TrackingField,
        email: TrackingField,
        phone: TrackingField,
        text: TrackingField,
      },
      custom: { currency: TrackingField },
      containers: {
        row: ({ children }) => children,
        rowBooleanGroup: ({ children }) => children,
        rowTotal: ({ children }) => children,
        section: ({ children }) => children,
      },
    };
    const targetName = "filingParty.city.value";
    const unrelatedName = "filingParty.state.value";
    const config = reviewPipelineFixture.config as FormConfiguration;
    const initialData = camelizeDeep(
      reviewPipelineFixture.initialData
    ) as FormData;
    render(
      <DynamicForm
        components={components}
        config={config}
        initialData={initialData}
        onSubmit={vi.fn()}
        validateOnMount
      />
    );
    const target = document.querySelector<HTMLInputElement>(
      `input[name="${targetName}"]`
    );
    expect(target).not.toBeNull();
    const unrelatedRendersBefore = renderSpy.mock.calls.filter(
      ([name]) => name === unrelatedName
    ).length;

    // act
    fireEvent.change(target as HTMLInputElement, {
      target: { value: "New city" },
    });
    await waitFor(() => expect(target).toHaveValue("New city"));

    // assert
    const unrelatedRendersAfter = renderSpy.mock.calls.filter(
      ([name]) => name === unrelatedName
    ).length;
    expect(unrelatedRendersAfter).toBe(unrelatedRendersBefore);
  });

  it("keeps the parsed tree stable when no custom registry is supplied", () => {
    // arrange
    const renderSpy = vi.fn();
    const TrackingField: BaseFieldComponent = ({ config, field }) => {
      renderSpy(config.name);
      return <input aria-label={config.label} {...field} />;
    };
    const components: ComponentRegistry = {
      fields: { text: TrackingField },
    };
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "first", label: "First" },
        { type: "text", name: "second", label: "Second" },
      ],
    };
    const props = {
      components,
      config,
      initialData: { first: "one", second: "two" },
      onSubmit: vi.fn(),
    };
    const { rerender } = render(<DynamicForm {...props} id="before" />);
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // act — rerender the root with an unrelated DOM prop. `components.custom`
    // is absent, so its empty fallback must retain referential identity.
    rerender(<DynamicForm {...props} id="after" />);

    // assert — parsedConfig remains stable and memoized renderers bail out
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it("does not rerender fields when an equivalent inline registry is recreated", () => {
    // arrange
    const renderSpy = vi.fn();
    const TrackingField: BaseFieldComponent = ({ config, field }) => {
      renderSpy(config.name);
      return <input aria-label={config.label} {...field} />;
    };
    const config: FormConfiguration = {
      elements: [
        { type: "text", name: "first", label: "First" },
        { type: "text", name: "second", label: "Second" },
      ],
    };
    const onSubmit = vi.fn();
    const renderForm = (id: string) => (
      <DynamicForm
        components={{ fields: { text: TrackingField } }}
        config={config}
        id={id}
        initialData={{ first: "one", second: "two" }}
        onSubmit={onSubmit}
      />
    );
    const { rerender } = render(renderForm("before"));
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // act
    rerender(renderForm("after"));

    // assert
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});
