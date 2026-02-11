# Dynamic Forms

Configuration-driven form engine for React with react-hook-form and Zod integration.

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration Reference](#configuration-reference)
  - [FormConfiguration](#formconfiguration)
  - [Field Types](#field-types)
  - [Validation Configuration](#validation-configuration)
  - [Container Layout](#container-layout)
- [Usage Examples](#usage-examples)
  - [Nested Field Paths](#nested-field-paths)
  - [Two-Column Layout](#two-column-layout)
  - [Section Layout](#section-layout)
  - [Three-Column Layout](#three-column-layout)
  - [Custom Field Component](#custom-field-component)
  - [JSON Logic Conditional Validation](#json-logic-conditional-validation)
  - [Visibility Control](#visibility-control)
- [API Reference](#api-reference)
  - [DynamicForm Props](#dynamicform-props)
  - [ComponentRegistry](#componentregistry)
  - [Hooks](#hooks)
  - [Exports](#exports)
- [Creating Field Components](#creating-field-components)
- [Creating Container Components](#creating-container-components)
- [Development](#development)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Dynamic Forms is a **pure rendering engine** — it traverses a JSON configuration tree and delegates all visual rendering to consumer-provided components. The engine handles validation, visibility, form state, and Zod schema generation. You control how everything looks.

**Key Principles:**
- **Zero styles, zero defaults** — the engine renders nothing visual on its own
- **Two rendering paths** — field → `components.fields[type]`, container → `components.containers[variant]`
- **Single entry point** — `ComponentRegistry` is the only way to provide visual implementations
- **Config drives everything** — variant determines what container component renders

**Key Features:**
- Define forms as JSON configuration
- Flexible validation: external resolver, Zod schema, or config-driven
- Full react-hook-form integration
- Nested field paths with dot notation
- Conditional visibility and validation with JSON Logic
- Field dependencies with cascading resets
- Select fields with static/dynamic options
- Array fields for repeatable groups
- Variant-based container system (row, column, section, or any custom variant)
- Custom field components with type-safe props
- Meta pass-through for consumer-specific data

## Installation

```bash
npm install rhf-dynamic-forms
# or
pnpm add rhf-dynamic-forms
# or
yarn add rhf-dynamic-forms
```

**Peer Dependencies:**

```bash
npm install react@^19 react-dom@^19
```

## Quick Start

```tsx
import {
  DynamicForm,
  type FormConfiguration,
  type ComponentRegistry,
} from 'rhf-dynamic-forms';

// 1. Define your form configuration
const config: FormConfiguration = {
  name: "Contact Form",
  elements: [
    {
      type: "text",
      name: "fullName",
      label: "Full Name",
      validation: { required: true, minLength: 2 },
    },
    {
      type: "email",
      name: "email",
      label: "Email Address",
      validation: { required: true },
    },
  ],
};

// 2. Create a unified component registry
const components: ComponentRegistry = {
  fields: {
    text: ({ field, fieldState, config }) => (
      <div>
        <label>{config.label}</label>
        <input {...field} placeholder={config.placeholder} />
        {fieldState.error && <span>{fieldState.error.message}</span>}
      </div>
    ),
    email: ({ field, fieldState, config }) => (
      <div>
        <label>{config.label}</label>
        <input {...field} type="email" placeholder={config.placeholder} />
        {fieldState.error && <span>{fieldState.error.message}</span>}
      </div>
    ),
    boolean: ({ field, config }) => (
      <label>
        <input {...field} type="checkbox" checked={field.value} />
        {config.label}
      </label>
    ),
    phone: ({ field, config }) => (
      <div>
        <label>{config.label}</label>
        <input {...field} type="tel" />
      </div>
    ),
    date: ({ field, config }) => (
      <div>
        <label>{config.label}</label>
        <input {...field} type="date" />
      </div>
    ),
    select: ({ field, config }) => (
      <div>
        <label>{config.label}</label>
        <select {...field}>
          {config.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    ),
    array: ({ field, config }) => <div>{/* array implementation */}</div>,
  },
};

// 3. Render the form
function App() {
  return (
    <DynamicForm
      config={config}
      components={components}
      onSubmit={(data) => console.log('Submitted:', data)}
    >
      <button type="submit">Submit</button>
    </DynamicForm>
  );
}
```

## Configuration Reference

### FormConfiguration

The root configuration object that defines your form structure.

```typescript
interface FormConfiguration {
  name?: string;              // Optional form identifier
  elements: FormElement[];    // Array of fields and containers
}
```

### Field Types

The engine is **type-agnostic** — any string is a valid field type. Consumers register components for each type they use via `ComponentRegistry.fields`. The table below lists common conventions:

| Type | Description | Default Schema |
|------|-------------|----------------|
| `text` | Single-line text input | `z.string()` |
| `email` | Email input with validation | `z.string().email()` |
| `boolean` | Checkbox or toggle | `z.boolean()` |
| `phone` | Telephone number input | `z.string()` |
| `date` | Date picker | `z.string()` |
| `select` | Dropdown/multi-select with options | Structural (auto-detected) |
| `array` | Repeatable field groups | Structural (auto-detected) |
| `custom` | User-defined component | `z.unknown()` |
| `container` | Layout container (variant-based) | N/A (layout element) |
| *any string* | Consumer-defined type | `z.unknown()` (configurable via `setSchemaMap`) |

### Field Element Structure

The engine is **type-agnostic** — `type` is an open string, not a closed enum. Consumers can use any string (e.g. `"textarea"`, `"currency"`, `"rich-text"`). The engine only distinguishes `"container"` from everything else.

```typescript
interface BaseFieldElement {
  type: string;                    // Any string — consumer-defined field type
  name: string;                    // Field path (supports dot notation)
  label?: string;                  // Display label
  placeholder?: string;            // Placeholder text
  defaultValue?: string | number | boolean | null;
  validation?: ValidationConfig;   // Validation rules
  visible?: JsonLogicRule;         // Conditional visibility
  dependsOn?: string;              // Field dependency for cascading
  resetOnParentChange?: boolean;   // Reset when parent changes
  meta?: Record<string, unknown>;  // Consumer-specific metadata (passed through)
}
```

### Validation Configuration

```typescript
interface ValidationConfig {
  required?: boolean;              // Field must have a value
  minLength?: number;              // Minimum text length
  maxLength?: number;              // Maximum text length
  pattern?: string;                // Regex pattern
  message?: string;                // Custom error message
  condition?: JsonLogicRule;       // JSON Logic condition
}
```

### Container Layout

Containers are layout wrappers resolved by `variant` through the component registry. The engine only knows two things: **field** and **container**. What the container IS (row, column, section, card, grid) is decided by the consumer.

```typescript
interface ContainerElement {
  type: "container";
  variant?: string;                // Looked up in components.containers[variant]
  children?: FormElement[];        // Child elements rendered inside
  visible?: JsonLogicRule;         // Conditional visibility
  meta?: Record<string, unknown>;  // Consumer-specific metadata (width, title, etc.)
}
```

**Variant resolution:**
- `{ type: "container", variant: "section" }` → `components.containers["section"]`
- `{ type: "container", variant: "row" }` → `components.containers["row"]`
- `{ type: "container", variant: "column" }` → `components.containers["column"]`
- `{ type: "container" }` → `components.containers["default"]` ?? bare Fragment

**Two-column row example:**

```typescript
{
  type: "container",
  variant: "row",
  children: [
    {
      type: "container",
      variant: "column",
      meta: { width: "calc(50% - 0.5rem)" },
      children: [
        { type: "text", name: "firstName", label: "First Name" },
      ],
    },
    {
      type: "container",
      variant: "column",
      meta: { width: "calc(50% - 0.5rem)" },
      children: [
        { type: "text", name: "lastName", label: "Last Name" },
      ],
    },
  ],
}
```

**Section example:**

```typescript
{
  type: "container",
  variant: "section",
  meta: {
    title: "Personal Information",
    description: "Enter your details below.",
  },
  children: [
    { type: "text", name: "firstName", label: "First Name" },
    { type: "email", name: "email", label: "Email" },
  ],
}
```

## Usage Examples

### Nested Field Paths

Use dot notation to create nested data structures:

```typescript
const config: FormConfiguration = {
  elements: [
    { type: "text", name: "contact.firstName", label: "First Name" },
    { type: "text", name: "contact.lastName", label: "Last Name" },
    { type: "email", name: "contact.email", label: "Email" },
  ],
};
// Submitted: { contact: { firstName: "John", lastName: "Doe", email: "john@example.com" } }
```

### Two-Column Layout

```typescript
{
  type: "container",
  variant: "row",
  children: [
    {
      type: "container",
      variant: "column",
      meta: { width: "calc(50% - 0.5rem)" },
      children: [
        { type: "email", name: "email", label: "Email", validation: { required: true } },
      ],
    },
    {
      type: "container",
      variant: "column",
      meta: { width: "calc(50% - 0.5rem)" },
      children: [
        { type: "phone", name: "phone", label: "Phone" },
      ],
    },
  ],
}
```

### Section Layout

```tsx
import type { ContainerComponent, CustomContainerRegistry } from 'rhf-dynamic-forms';

// Section — reads title/description from meta
const Section: ContainerComponent = ({ config, children }) => (
  <fieldset>
    {config.meta?.title && <legend>{config.meta.title as string}</legend>}
    {config.meta?.description && <p>{config.meta.description as string}</p>}
    <div>{children}</div>
  </fieldset>
);

// Row — horizontal flex
const Row: ContainerComponent = ({ children }) => (
  <div style={{ display: 'flex', gap: '1rem' }}>{children}</div>
);

// Column — reads width from meta
const Column: ContainerComponent = ({ config, children }) => (
  <div style={{ width: (config.meta?.width as string) ?? 'auto' }}>{children}</div>
);

const containers: CustomContainerRegistry = {
  section: Section,
  row: Row,
  column: Column,
};
```

### Three-Column Layout

```typescript
{
  type: "container",
  variant: "row",
  children: [
    {
      type: "container",
      variant: "column",
      meta: { width: "calc(33.333% - 0.667rem)" },
      children: [{ type: "text", name: "company", label: "Company" }],
    },
    {
      type: "container",
      variant: "column",
      meta: { width: "calc(33.333% - 0.667rem)" },
      children: [{ type: "select", name: "dept", label: "Department", options: [] }],
    },
    {
      type: "container",
      variant: "column",
      meta: { width: "calc(33.333% - 0.667rem)" },
      children: [{ type: "text", name: "title", label: "Job Title" }],
    },
  ],
}
```

### Custom Field Component

```tsx
import { defineCustomComponent, type ComponentRegistry } from 'rhf-dynamic-forms';
import { z } from 'zod/v4';

const RatingField = defineCustomComponent({
  component: ({ field, componentProps }) => (
    <div className="rating">
      {Array.from({ length: componentProps.maxStars }, (_, i) => (
        <button key={i} type="button" onClick={() => field.onChange(i + 1)}>
          {i < (field.value as number ?? 0) ? '\u2605' : '\u2606'}
        </button>
      ))}
    </div>
  ),
  propsSchema: z.object({ maxStars: z.number().int().min(1).max(10).default(5) }),
  defaultProps: { maxStars: 5 },
  displayName: 'RatingField',
});

const components: ComponentRegistry = {
  fields: { /* ... */ },
  custom: { RatingField },
};

// In config:
{ type: "custom", name: "rating", label: "Rate us", component: "RatingField", componentProps: { maxStars: 10 } }
```

### JSON Logic Conditional Validation

```typescript
{
  type: "phone",
  name: "phone",
  label: "Phone Number",
  validation: {
    condition: {
      or: [
        { "!": { var: "hasPhone" } },
        { and: [{ var: "hasPhone" }, { regex_match: ["^[0-9]{10}$", { var: "phone" }] }] },
      ],
    },
    message: "Please enter a valid 10-digit phone number",
  },
}
```

**Available JSON Logic Operations:**
- Standard: `var`, `and`, `or`, `!`, `==`, `!=`, `>`, `<`, `>=`, `<=`, `if`
- Custom: `regex_match` - `["pattern", { var: "fieldName" }]`

### Visibility Control

```typescript
{ type: "boolean", name: "showNickname", label: "Show nickname", defaultValue: false },
{ type: "text", name: "nickname", label: "Nickname", visible: { "==": [{ var: "showNickname" }, true] } }
```

## API Reference

### DynamicForm Props

```typescript
interface DynamicFormProps {
  config: FormConfiguration;                    // Form configuration
  components: ComponentRegistry;                // Component implementations (required)
  onSubmit: (data: FormData) => void;          // Submit handler

  initialData?: FormData;
  onChange?: (data: FormData, field: string) => void;
  onError?: (errors: unknown) => void;
  onReset?: () => void;
  onValidationChange?: (errors: unknown, isValid: boolean) => void;
  mode?: "onChange" | "onBlur" | "onSubmit" | "onTouched" | "all";
  invisibleFieldValidation?: "skip" | "validate" | "warn";
  fieldWrapper?: FieldWrapperFunction;
  className?: string;
  style?: CSSProperties;
  id?: string;
  children?: React.ReactNode;
  ref?: React.Ref<DynamicFormRef>;
}
```

### ComponentRegistry

Single entry point for all visual implementations:

```typescript
interface ComponentRegistry {
  fields: FieldComponentRegistry;           // Required: standard field components
  custom?: CustomComponentRegistry;         // Optional: custom field components
  containers?: CustomContainerRegistry;     // Optional: container components by variant
}
```

### Hooks

```typescript
const { config, form } = useDynamicFormContext();
const context = useDynamicFormContextSafe(); // returns null outside form
```

### Exports

```typescript
// Components
export { DynamicForm, DynamicFormContext };
export { useDynamicFormContext, useDynamicFormContextSafe };
export { defineCustomComponent };
export { parseConfiguration, safeParseConfiguration, ConfigurationError };

// Types
export type {
  FormConfiguration, FormElement, FieldElement, ContainerElement, LayoutElement,
  BaseFieldElement, BaseFieldProps, BaseFieldComponent,
  ValidationConfig, FormData, DynamicFormProps, DynamicFormRef,
  ComponentRegistry, FieldComponentRegistry, CustomComponentRegistry, CustomContainerRegistry,
  ContainerComponent, ContainerProps,
  SelectFieldComponent, ArrayFieldComponent, CustomFieldComponent,
  SelectFieldElement, ArrayFieldElement, CustomFieldElement, SelectOption,
  SchemaFactory, SchemaMap,
};

// Schema (configurable type → schema mapping)
export { buildFieldSchema, generateZodSchema, defaultSchemaMap, setSchemaMap, resetSchemaMap };

// Utilities
export {
  createVisibilityAwareResolver, calculateVisibility,
  flattenFields, getFieldNames, mergeDefaults, getNestedValue, setNestedValue,
  applyJsonLogic, evaluateCondition,
  isFieldElement, isContainerElement, isCustomFieldElement, isArrayFieldElement, isSectionContainer,
};
```

## Creating Field Components

All field components use `BaseFieldComponent` — the engine is type-agnostic:

```tsx
import type { BaseFieldComponent } from 'rhf-dynamic-forms';

const TextField: BaseFieldComponent = ({ field, fieldState, config }) => (
  <div className="field">
    {config.label && <label htmlFor={field.name}>{config.label}</label>}
    <input id={field.name} type="text" placeholder={config.placeholder} {...field} />
    {fieldState.error && <span role="alert">{fieldState.error.message}</span>}
  </div>
);
```

For structurally-specific fields (select, array), cast `config` to access extra properties:

```tsx
import type { BaseFieldComponent, SelectFieldElement } from 'rhf-dynamic-forms';

const SelectField: BaseFieldComponent = ({ field, fieldState, config: baseConfig }) => {
  const config = baseConfig as SelectFieldElement;
  return (
    <select {...field}>
      {config.options?.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};
```

## Creating Container Components

```tsx
import type { ContainerComponent, CustomContainerRegistry } from 'rhf-dynamic-forms';

const Row: ContainerComponent = ({ config, children }) => (
  <div style={{ display: 'flex', gap: (config.meta?.gap as string) ?? '1rem', flexWrap: 'wrap' }}>
    {children}
  </div>
);

const Column: ContainerComponent = ({ config, children }) => (
  <div style={{ width: (config.meta?.width as string) ?? 'auto' }}>{children}</div>
);

const Section: ContainerComponent = ({ config, children }) => (
  <fieldset>
    {config.meta?.title && <legend>{config.meta.title as string}</legend>}
    <div>{children}</div>
  </fieldset>
);

const containers: CustomContainerRegistry = { row: Row, column: Column, section: Section };
```

## Development

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Build library
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm typecheck    # TypeScript type checking
pnpm lint         # Check for lint errors
```

### Project Structure

```text
src/
├── components/          # FormRenderer, ElementRenderer, FieldRenderer, ContainerRenderer
├── context/             # React context
├── hooks/               # useDynamicFormContext
├── parser/              # Config parsing & validation
├── schema/              # Zod schema generation
├── resolver/            # Visibility-aware resolver
├── validation/          # JSON Logic evaluation
├── customComponents/    # Custom component utilities
├── types/               # TypeScript definitions
└── utils/               # Utilities

sample/                  # Sample application
├── App.tsx              # Demo form (wiring)
├── sampleFormConfig.ts  # Sample form configuration
├── fields/              # Sample field components
└── containers/          # Sample containers (row, column, section)
```

## Tech Stack

- **React 19** - UI framework
- **react-hook-form** - Form state management
- **Zod v4** - Schema validation
- **TypeScript** - Type safety
- **Vitest** - Testing
- **tsdown** - Library bundling (ESM + CJS)
- **Vite** - Dev server

## Contributing

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`

| Type | Purpose |
|------|---------|
| `feat` | New feature (minor bump) |
| `fix` | Bug fix (patch bump) |
| `feat!` / `BREAKING CHANGE` | Breaking change (major bump) |
| `refactor`, `docs`, `test`, `chore` | Non-release |

## License

MIT
