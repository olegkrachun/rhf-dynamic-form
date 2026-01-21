# Dynamic Forms

Configuration-driven form generation library for React with react-hook-form and Zod integration.

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
  - [Custom Field Component](#custom-field-component)
  - [JSON Logic Conditional Validation](#json-logic-conditional-validation)
- [API Reference](#api-reference)
  - [DynamicForm Props](#dynamicform-props)
  - [Validation Options](#validation-options)
  - [Hooks](#hooks)
  - [Exports](#exports)
- [Creating Field Components](#creating-field-components)
- [Development](#development)
- [Tech Stack](#tech-stack)
- [License](#license)

---

## Overview

Dynamic Forms enables rapid deployment of data collection forms by defining form structures, validations, and display logic through declarative JSON configurations. Instead of writing custom form components for each use case, describe your form as data and let the library handle rendering and validation.

**Key Benefits:**
- Define forms as JSON configuration
- Flexible validation: external resolver, Zod schema, or config-driven
- Full react-hook-form integration
- Nested field paths with dot notation
- Conditional visibility and validation with JSON Logic
- Field dependencies with cascading resets
- Select fields with static/dynamic options
- Array fields for repeatable groups
- Extensible component architecture

## Installation

```bash
npm install dynamic-forms
# or
pnpm add dynamic-forms
# or
yarn add dynamic-forms
```

**Peer Dependencies:**

```bash
npm install react react-dom
```

## Quick Start

```tsx
import { DynamicForm, type FormConfiguration, type FieldComponentRegistry } from 'dynamic-forms';

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

// 2. Create field components (or use a UI library)
const fieldComponents: FieldComponentRegistry = {
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
};

// 3. Render the form
function App() {
  return (
    <DynamicForm
      config={config}
      fieldComponents={fieldComponents}
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
  elements: FormElement[];    // Array of fields and layouts
}
```

### Field Types

The library supports the following built-in field types:

| Type | Description | Default Value Type |
|------|-------------|-------------------|
| `text` | Single-line text input | `string` |
| `email` | Email input with validation | `string` |
| `boolean` | Checkbox or toggle | `boolean` |
| `phone` | Telephone number input | `string` |
| `date` | Date picker | `string` |
| `select` | Dropdown/multi-select with options | `string \| string[]` |
| `array` | Repeatable field groups | `array` |
| `custom` | User-defined component | `unknown` |

### Field Element Structure

```typescript
interface FieldElement {
  type: "text" | "email" | "boolean" | "phone" | "date" | "custom";
  name: string;                    // Field path (supports dot notation)
  label?: string;                  // Display label
  placeholder?: string;            // Placeholder text
  defaultValue?: string | number | boolean | null;
  validation?: ValidationConfig;   // Validation rules
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

Create multi-column layouts with containers:

```typescript
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
    { type: "text", name: "address.street", label: "Street" },
    { type: "text", name: "address.city", label: "City" },
  ],
};

// Submitted data structure:
// {
//   contact: { firstName: "John", lastName: "Doe", email: "john@example.com" },
//   address: { street: "123 Main St", city: "New York" }
// }
```

### Two-Column Layout

```typescript
const config: FormConfiguration = {
  elements: [
    {
      type: "container",
      columns: [
        {
          type: "column",
          width: "calc(50% - 0.5rem)", // Account for gap
          elements: [
            { type: "email", name: "email", label: "Email", validation: { required: true } },
            { type: "date", name: "birthDate", label: "Birth Date" },
          ],
        },
        {
          type: "column",
          width: "calc(50% - 0.5rem)",
          elements: [
            { type: "phone", name: "phone", label: "Phone" },
            { type: "text", name: "company", label: "Company" },
          ],
        },
      ],
    },
  ],
};
```

### Custom Field Component

Register custom components for specialized inputs. You can use simple components or fully typed definitions with Zod schema validation:

```tsx
import {
  defineCustomComponent,
  type CustomComponentRegistry,
  type CustomComponentRenderProps,
} from 'dynamic-forms';
import { z } from 'zod/v4';

// Option 1: Simple component
const SimpleRating = ({ field, config, componentProps }: CustomComponentRenderProps) => {
  const maxStars = (componentProps?.maxStars as number) ?? 5;
  return (
    <div>
      <label>{config.label}</label>
      <div>
        {Array.from({ length: maxStars }, (_, i) => (
          <button key={i} type="button" onClick={() => field.onChange(i + 1)}>
            {i < (field.value ?? 0) ? '★' : '☆'}
          </button>
        ))}
      </div>
    </div>
  );
};

// Option 2: Type-safe definition with Zod schema validation
const RatingField = defineCustomComponent({
  component: ({ field, componentProps }) => (
    <div className="rating">
      {Array.from({ length: componentProps.maxStars }, (_, i) => (
        <button key={i} type="button" onClick={() => field.onChange(i + 1)}>
          {i < (field.value as number ?? 0) ? '★' : '☆'}
        </button>
      ))}
    </div>
  ),
  propsSchema: z.object({
    maxStars: z.number().int().min(1).max(10).default(5),
  }),
  defaultProps: { maxStars: 5 },
  displayName: 'RatingField',
});

// Register custom components
const customComponents: CustomComponentRegistry = {
  SimpleRating,
  RatingField,
};

// Use in configuration
const config: FormConfiguration = {
  elements: [
    {
      type: "custom",
      name: "rating",
      label: "Rate our service",
      component: "RatingField",
      componentProps: { maxStars: 10 }, // Validated against propsSchema
    },
  ],
};

// Pass to DynamicForm
<DynamicForm
  config={config}
  fieldComponents={fieldComponents}
  customComponents={customComponents}
  onSubmit={handleSubmit}
/>
```

### JSON Logic Conditional Validation

Use JSON Logic for complex validation rules that depend on other field values:

```typescript
const config: FormConfiguration = {
  elements: [
    {
      type: "boolean",
      name: "hasPhone",
      label: "I have a phone number",
    },
    {
      type: "phone",
      name: "phone",
      label: "Phone Number",
      validation: {
        // Valid if: hasPhone is false OR phone matches 10-digit pattern
        condition: {
          or: [
            { "!": { var: "hasPhone" } },
            {
              and: [
                { var: "hasPhone" },
                { regex_match: ["^[0-9]{10}$", { var: "phone" }] },
              ],
            },
          ],
        },
        message: "Please enter a valid 10-digit phone number",
      },
    },
    {
      type: "boolean",
      name: "acceptTerms",
      label: "I accept the terms and conditions",
      validation: {
        // Checkbox must be checked
        condition: { var: "acceptTerms" },
        message: "You must accept the terms and conditions",
      },
    },
  ],
};
```

**Available JSON Logic Operations:**
- Standard operators: `var`, `and`, `or`, `!`, `==`, `!=`, `>`, `<`, `>=`, `<=`, `if`
- Custom: `regex_match` - `["pattern", { var: "fieldName" }]`

## API Reference

### DynamicForm Props

```typescript
interface DynamicFormProps {
  // Required
  config: FormConfiguration;                    // Form configuration
  fieldComponents: FieldComponentRegistry;      // Component implementations
  onSubmit: (data: FormData) => void;          // Submit handler

  // Optional - Validation (priority order: resolver > schema > config-driven)
  resolver?: Resolver<FormData>;                // Custom react-hook-form resolver (Yup, Joi, etc.)
  schema?: ZodSchema;                           // External Zod schema (wrapped with visibility-aware resolver)

  // Optional - Components
  initialData?: FormData;                       // Pre-fill form values
  customComponents?: CustomComponentRegistry;   // Custom field components
  customContainers?: CustomContainerRegistry;   // Custom layout containers

  // Optional - Event handlers
  onChange?: (data: FormData, field: string) => void;
  onError?: (errors: unknown) => void;
  onReset?: () => void;
  onValidationChange?: (errors: unknown, isValid: boolean) => void;

  // Optional - Form behavior
  mode?: "onChange" | "onBlur" | "onSubmit" | "onTouched" | "all";
  invisibleFieldValidation?: "skip" | "validate" | "warn";
  fieldWrapper?: FieldWrapperFunction;          // Wrap each field with custom component

  // Optional - HTML attributes
  className?: string;
  style?: CSSProperties;
  id?: string;
  children?: React.ReactNode;                   // Submit button, etc.
}
```

### Validation Options

The library supports three approaches to validation:

```tsx
// Option 1: External resolver (full control - Yup, Joi, Vest, custom)
import { yupResolver } from '@hookform/resolvers/yup';
<DynamicForm resolver={yupResolver(yupSchema)} ... />

// Option 2: External Zod schema (wrapped with visibility-aware resolver)
<DynamicForm schema={myZodSchema} invisibleFieldValidation="skip" ... />

// Option 3: Config-driven (auto-generated from field validation configs)
<DynamicForm config={configWithValidation} ... />

// Option 4: No validation (omit resolver, schema, and validation in config)
<DynamicForm config={simpleConfig} ... />
```

### Hooks

```typescript
// Access form context inside nested components
const { config, form } = useDynamicFormContext();

// Safe version that returns null outside form context
const context = useDynamicFormContextSafe();
```

### Field Component Props

All field components receive these props:

```typescript
interface BaseFieldProps {
  field: ControllerRenderProps;     // react-hook-form: value, onChange, onBlur, ref
  fieldState: ControllerFieldState; // error, invalid, isTouched, isDirty
  config: FieldElement;             // Field configuration
}
```

### Exports

```typescript
// Components
export { DynamicForm } from 'dynamic-forms';

// Hooks
export { useDynamicFormContext, useDynamicFormContextSafe } from 'dynamic-forms';

// Custom Components
export {
  defineCustomComponent,        // Type-safe component definition helper
  ConfigurationError,           // Error class for invalid configurations
} from 'dynamic-forms';

// Types
export type {
  FormConfiguration,
  FormElement,
  FieldElement,
  ContainerElement,
  ColumnElement,
  ValidationConfig,
  FieldComponentRegistry,
  CustomComponentRegistry,
  CustomContainerRegistry,
  FormData,
  ZodSchema,
  // Custom component types
  CustomComponentDefinition,
  CustomComponentRenderProps,
  // Field component types
  TextFieldComponent,
  EmailFieldComponent,
  BooleanFieldComponent,
  PhoneFieldComponent,
  DateFieldComponent,
  SelectFieldComponent,
  ArrayFieldComponent,
  CustomFieldComponent,
  // Field element types
  SelectFieldElement,
  ArrayFieldElement,
  SelectOption,
} from 'dynamic-forms';

// Utilities
export {
  parseConfiguration,
  safeParseConfiguration,
  generateZodSchema,
  createVisibilityAwareResolver,
  calculateVisibility,
  flattenFields,
  getFieldNames,
  mergeDefaults,
  applyJsonLogic,
  evaluateCondition,
  isFieldElement,
  isContainerElement,
  isColumnElement,
  isCustomFieldElement,
  isArrayFieldElement,
} from 'dynamic-forms';
```

## Creating Field Components

Field components are React components that render form inputs. They receive react-hook-form controller props for state management.

```tsx
import type { TextFieldComponent } from 'dynamic-forms';

const TextField: TextFieldComponent = ({ field, fieldState, config }) => {
  return (
    <div className="field">
      {config.label && (
        <label htmlFor={field.name}>
          {config.label}
          {config.validation?.required && <span>*</span>}
        </label>
      )}

      <input
        id={field.name}
        type="text"
        placeholder={config.placeholder}
        aria-invalid={fieldState.invalid}
        aria-describedby={fieldState.error ? `${field.name}-error` : undefined}
        {...field}
      />

      {fieldState.error && (
        <span id={`${field.name}-error`} role="alert">
          {fieldState.error.message}
        </span>
      )}
    </div>
  );
};
```

## Development

### Scripts

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Build library
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm typecheck    # TypeScript type checking
pnpm lint         # Check for lint errors
pnpm lint:fix     # Auto-fix lint errors
```

### Project Structure

```
src/
├── components/          # React components
│   ├── FormRenderer     # Renders all elements
│   ├── ElementRenderer  # Routes to field/container
│   ├── FieldRenderer    # Renders fields via registry
│   └── ContainerRenderer # Renders layouts
├── context/             # React context
├── hooks/               # useDynamicFormContext
├── parser/              # Config parsing
├── schema/              # Zod schema generation
├── resolver/            # Visibility-aware resolver
├── validation/          # JSON Logic evaluation
├── types/               # TypeScript definitions
└── utils/               # Utilities

sample/                  # Sample application
├── App.tsx              # Demo form
├── fields/              # Sample field components
└── containers/          # Sample containers
```

### Running the Sample App

```bash
pnpm dev
# Open http://localhost:3000
```

## Tech Stack

- **React 19** - UI framework
- **react-hook-form** - Form state management
- **Zod v4** - Schema validation
- **TypeScript** - Type safety
- **Vitest** - Testing
- **tsdown** - Library bundling (ESM + CJS)
- **Vite** - Dev server

## License

MIT
