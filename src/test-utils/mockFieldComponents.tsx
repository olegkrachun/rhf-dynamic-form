import type { FieldComponentRegistry } from "../types";

/**
 * Shared mock field components for testing.
 * Used across FieldRenderer, FormRenderer, and ElementRenderer tests.
 */
export const mockFieldComponents: FieldComponentRegistry = {
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
      <select id={field.name} {...field} />
    </div>
  ),
  array: ({ config }) => (
    <div data-testid={`field-${config.name}`}>
      <span>{config.label} (array)</span>
    </div>
  ),
};
