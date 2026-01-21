# Dynamic Form Library - Technical Documentation

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Core Concepts](#3-core-concepts)
4. [Configuration Schema Reference](#4-configuration-schema-reference)
5. [React Hook Form Integration](#5-react-hook-form-integration)
6. [Field Component Interfaces](#6-field-component-interfaces)
7. [Layout System](#7-layout-system)
8. [Validation System](#8-validation-system)
9. [Visibility Control System](#9-visibility-control-system)
10. [Event Handling](#10-event-handling)
11. [Custom Components](#11-custom-components)
12. [Implementation Guide](#12-implementation-guide)
13. [Integration Guide](#13-integration-guide)
14. [TypeScript Type Definitions](#14-typescript-type-definitions)
15. [Testing Strategy](#15-testing-strategy)
16. [Usage Examples](#16-usage-examples)

---

## 1. Executive Summary

### 1.1 Purpose

The Dynamic Form Library is a configuration-driven form generation system for React applications. It enables rapid deployment of data collection forms by defining form structures, validations, and display logic through declarative JSON configurations, significantly reducing the need for custom development.

### 1.2 Key Features

- **Configuration-Driven**: Define entire forms through JSON configuration
- **JSON Logic Integration**: Declarative validation and visibility rules using JSON Logic
- **Zod Schema Generation**: Dynamic Zod schema generation from configuration for type-safe validation
- **Flexible Layout System**: Support for containers and columns
- **Extensible Architecture**: Plugin system for custom field types and containers
- **React Hook Form Foundation**: Built on proven form management library
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Accessibility**: WCAG-compliant form rendering

### 1.3 Technology Stack

- **Runtime**: React 18+
- **Language**: TypeScript 5+
- **Form Management**: react-hook-form
- **Schema Validation**: Zod (dynamic schema generation from configuration)
- **Form Resolver**: @hookform/resolvers/zod
- **Validation Engine**: JSON Logic (json-logic-js) for complex conditional rules
- **Build Tool**: Vite/Rollup
- **Testing**: Vitest + React Testing Library

### 1.4 Supported Field Types

As defined in the configuration schema:

| Type | Description |
|------|-------------|
| `text` | Single-line text input |
| `email` | Email input with built-in validation |
| `boolean` | Checkbox/toggle for boolean values |
| `phone` | Phone number input |
| `date` | Date picker input |
| `select` | Dropdown/multi-select with options |
| `array` | Repeatable field groups |
| `container` | Layout container with columns |
| `column` | Column within a container |
| `custom` | User-defined custom component |

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Application Layer                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │    JSON      │  │    Event     │  │    Custom Element            │  │
│  │ Configuration│  │   Handlers   │  │    Configuration             │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────────┘  │
│         │                 │                      │                      │
│         ▼                 ▼                      ▼                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    DynamicForm Component                        │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │              Configuration Parser                           ││   │
│  │  │  • Schema Validation                                        ││   │
│  │  │  • Configuration Normalization                              ││   │
│  │  │  • Default Value Resolution                                 ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │              Zod Schema Generator                           ││   │
│  │  │  • Dynamic Schema Generation                                ││   │
│  │  │  • JSON Logic Condition Integration                         ││   │
│  │  │  • Nested Path Support                                      ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │              React Hook Form Integration                    ││   │
│  │  │  • useForm Hook with Zod Resolver                           ││   │
│  │  │  • Form State Management                                    ││   │
│  │  │  • Visibility-Aware Validation                              ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │              Rendering Engine                               ││   │
│  │  │  • Element Resolver                                         ││   │
│  │  │  • Layout Manager                                           ││   │
│  │  │  • Field Registry                                           ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Rendered HTML Form                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Hierarchy

```
DynamicForm
├── FormProvider (react-hook-form)
│   └── DynamicFormContext
├── FormRenderer
│   ├── ContainerRenderer
│   │   └── ColumnRenderer
│   │       └── ElementRenderer
│   └── ElementRenderer
│       ├── FieldRenderer (uses registered field components)
│       │   ├── [text] → User-provided component
│       │   ├── [email] → User-provided component
│       │   ├── [boolean] → User-provided component
│       │   ├── [phone] → User-provided component
│       │   ├── [date] → User-provided component
│       │   └── [custom] → User-provided component
│       └── ValidationMessage
└── FormActions
```

### 2.3 Data Flow

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  Configuration │───▶│  Parse &       │───▶│  Generate Zod  │
│  Input         │    │  Validate      │    │  Schema        │
│                │    │                │    │                │
└────────────────┘    └────────────────┘    └───────┬────────┘
                                                    │
                                                    ▼
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  Emit Events   │◀───│  Update State  │◀───│  Initialize    │
│  (onChange,    │    │  & Validate    │    │  react-hook-   │
│   onSubmit)    │    │  with Zod      │    │  form          │
└────────────────┘    └────────────────┘    └────────────────┘
         │                    ▲                     │
         │                    │                     │
         └────────────────────┴─────────────────────┘
                    User Interaction
```

---

## 3. Core Concepts

### 3.1 Configuration-Driven Forms

The library operates on the principle that form structure, validation, and behavior can be fully described through configuration. This eliminates the need to write React components for each form.

**Benefits:**
- Forms can be modified without code changes
- Configuration can be stored in databases or external files
- Non-developers can create forms using configuration tools
- Consistent form behavior across the application

### 3.2 Nested Field Paths

The library supports dot-notation for nested data structures. Field names like `source.name`, `source.email`, `source.has_phone` map to nested object paths:

```typescript
// Field name: "source.name" maps to:
{
  source: {
    name: "John Doe"
  }
}

// Field name: "source.has_phone" maps to:
{
  source: {
    has_phone: true
  }
}
```

This is natively supported by react-hook-form's `useController` and `register` functions, and the Zod schema generator creates properly nested object schemas.

### 3.3 JSON Logic

JSON Logic is a domain-specific language for expressing logical operations in JSON format. The library uses JSON Logic for:

- **Conditional Visibility**: Show/hide fields based on form data
- **Complex Validation**: Define validation rules that depend on multiple fields

**JSON Logic Basics:**

```json
// Simple variable reference
{ "var": "source.has_phone" }

// Equality check
{ "==": [{ "var": "status" }, "active"] }

// Boolean AND
{ "and": [
  { "var": "source.has_phone" },
  { "!=": [{ "var": "source.phone" }, ""] }
]}

// Boolean OR
{ "or": [
  { "==": [{ "var": "type" }, "business"] },
  { "==": [{ "var": "type" }, "enterprise"] }
]}

// Negation (double negation for truthy check)
{ "!!": [{ "var": "source.has_phone" }] }

// Regex match - note: uses string path directly, not {"var": ...}
{ "regex_match": ["^[0-9]{10}$", "source.phone"] }
```

### 3.4 Zod Schema Generation

The library dynamically generates Zod schemas from form configuration. This provides:

- **Type-safe validation** with automatic TypeScript inference
- **Seamless react-hook-form integration** via `@hookform/resolvers/zod`
- **Composable validation rules** that can be extended
- **JSON Logic support** through Zod's `refine` and `superRefine` methods

The schema is generated once at initialization and remains stable. Visibility changes are handled at validation time through a custom resolver, not by regenerating the schema.

### 3.5 Element Types

The library distinguishes between three main element categories:

1. **Field Elements**: Input components that collect data (text, email, boolean, phone, date)
2. **Layout Elements**: Structural components for organizing fields (container, column)
3. **Custom Elements**: User-defined components for special requirements

### 3.6 Field Registry Pattern

The library does **not** provide built-in field implementations. Instead, it defines interfaces that consuming applications must implement and register:

```typescript
// Application provides field components
const fieldComponents: FieldComponentRegistry = {
  text: MyTextInput,
  email: MyEmailInput,
  boolean: MyCheckbox,
  phone: MyPhoneInput,
  date: MyDatePicker,
};

<DynamicForm
  config={config}
  fieldComponents={fieldComponents}
/>
```

---

## 4. Configuration Schema Reference

### 4.1 Root Configuration

```typescript
interface FormConfiguration {
  /** Unique name/identifier for the form */
  name?: string;
  
  /** Array of form elements and layout components */
  elements: FormElement[];
  
  /** Custom component definitions */
  customComponents?: Record<string, CustomComponentDefinition>;
}
```

### 4.2 Element Types Enum

As defined in the specification:

```typescript
type ElementType = 
  | 'text' 
  | 'email' 
  | 'boolean' 
  | 'phone' 
  | 'date' 
  | 'container' 
  | 'column' 
  | 'custom';
```

### 4.3 Field Element Schema

```typescript
interface FieldElement {
  /** Element type identifier */
  type: 'text' | 'email' | 'boolean' | 'phone' | 'date';
  
  /** Unique identifier for form data binding (supports dot notation) */
  name: string;
  
  /** Display label */
  label?: string;
  
  /** Placeholder text (for text type) */
  placeholder?: string;
  
  /** Default value */
  defaultValue?: string | number | boolean | null;
  
  /** Validation configuration */
  validation?: ValidationConfig;
  
  /** Conditional visibility rules using JSON Logic */
  visible?: JsonLogicRule;
}
```

### 4.4 Validation Configuration

```typescript
interface ValidationConfig {
  /** Field is required */
  required?: boolean;
  
  /** Type-specific validation */
  type?: 'number' | 'email' | 'date';
  
  /** Minimum length for text fields */
  minLength?: number;
  
  /** Maximum length for text fields */
  maxLength?: number;
  
  /** Regular expression pattern */
  pattern?: string;
  
  /** JSON Logic condition for complex/dependent validation */
  condition?: JsonLogicRule;
  
  /** Custom error message for condition failure */
  message?: string;
}
```

### 4.5 Container Element Schema

```typescript
interface ContainerElement {
  type: 'container';
  
  /** Array of column elements */
  columns: ColumnElement[];
  
  /** Conditional visibility rules using JSON Logic */
  visible?: JsonLogicRule;
}
```

### 4.6 Column Element Schema

```typescript
interface ColumnElement {
  type: 'column';
  
  /** Column width (e.g., '50%') */
  width: string;
  
  /** Nested elements within the column */
  elements: FormElement[];
  
  /** Conditional visibility rules using JSON Logic */
  visible?: JsonLogicRule;
}
```

### 4.7 Custom Element Schema

```typescript
interface CustomElement {
  type: 'custom';
  
  /** Name of the registered custom component */
  component: string;
  
  /** Props to pass to the custom component */
  componentProps?: Record<string, unknown>;
  
  /** Field name for data binding (optional, supports dot notation) */
  name?: string;
  
  /** Conditional visibility rules using JSON Logic */
  visible?: JsonLogicRule;
}
```

### 4.8 Complete JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Dynamic Form Configuration Schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "The name of the form"
    },
    "elements": {
      "type": "array",
      "description": "An array of form elements and layout components",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "description": "The type of the form element or layout component",
            "enum": ["text", "email", "boolean", "phone", "date", "container", "column", "custom"]
          },
          "name": {
            "type": "string",
            "description": "The unique identifier for the form element's data (supports dot notation for nested paths)"
          },
          "label": {
            "type": "string",
            "description": "The user-friendly label for the form element"
          },
          "validation": {
            "type": "object",
            "description": "Validation rules for the form element",
            "properties": {
              "required": {
                "type": "boolean",
                "description": "Indicates if the field is required"
              },
              "type": {
                "type": "string",
                "enum": ["number", "email", "date"],
                "description": "Built-in type validation"
              },
              "minLength": {
                "type": "integer",
                "minimum": 0,
                "description": "Minimum length for text fields"
              },
              "maxLength": {
                "type": "integer",
                "description": "Maximum length for text fields"
              },
              "pattern": {
                "type": "string",
                "description": "Regular expression pattern for validation"
              },
              "condition": {
                "type": "object",
                "description": "Complex validation logic using JSON Logic"
              },
              "message": {
                "type": "string",
                "description": "Custom error message for condition failure"
              }
            },
            "additionalProperties": true
          },
          "visible": {
            "type": "object",
            "description": "Conditional visibility rules using JSON Logic"
          },
          "defaultValue": {
            "type": ["string", "number", "boolean", "null"],
            "description": "The default value for the field"
          },
          "placeholder": {
            "type": "string"
          },
          "columns": {
            "type": "array",
            "items": {
              "$ref": "#/properties/elements/items"
            },
            "description": "Array of columns within a container"
          },
          "width": {
            "type": "string",
            "description": "Width of the column (e.g., '50%')"
          },
          "elements": {
            "type": "array",
            "items": {
              "$ref": "#/properties/elements/items"
            },
            "description": "Array of elements within layout components (like container or column)"
          },
          "component": {
            "type": "string",
            "description": "The name or identifier of the custom component to use"
          },
          "componentProps": {
            "type": "object",
            "description": "Props to pass to the custom component",
            "additionalProperties": true
          }
        },
        "required": ["type"],
        "dependencies": {
          "column": ["width", "elements"],
          "container": ["columns"],
          "custom": ["component"]
        },
        "additionalProperties": false
      }
    },
    "customComponents": {
      "type": "object",
      "description": "An object mapping custom component names to their definitions"
    }
  },
  "required": ["elements"],
  "additionalProperties": false
}
```

---

## 5. React Hook Form Integration

### 5.1 Overview

The library uses [react-hook-form](https://react-hook-form.com/) as its foundation for form state management, integrated with Zod for schema-based validation. This provides:

- Performant re-renders (only affected fields re-render)
- Native support for nested field paths (dot notation)
- Type-safe validation via Zod schemas
- Uncontrolled components by default (better performance)
- Easy integration with UI libraries

### 5.2 Dependencies

```typescript
import { useForm, FormProvider, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
```

### 5.3 Form Context Setup

```typescript
interface DynamicFormContextValue {
  /** react-hook-form methods */
  form: UseFormReturn<FormData>;
  
  /** Parsed configuration */
  config: FormConfiguration;
  
  /** Visibility state for all fields */
  visibility: Record<string, boolean>;
  
  /** Registered field components */
  fieldComponents: FieldComponentRegistry;
  
  /** Registered custom components */
  customComponents: CustomComponentRegistry;
}

const DynamicFormContext = createContext<DynamicFormContextValue | null>(null);
```

### 5.4 Form Initialization with Zod

```typescript
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function DynamicForm({ 
  config, 
  initialData, 
  fieldComponents,
  invisibleFieldValidation = 'skip',
  ...props 
}: DynamicFormProps) {
  // Generate Zod schema ONCE from configuration
  const zodSchema = useMemo(
    () => generateZodSchemaWithConditions(config),
    [config]
  );

  // Track visibility state
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => 
    calculateVisibility(config, initialData || {})
  );

  // Create visibility-aware resolver
  const resolver = useMemo(
    () => createVisibilityAwareResolver(zodSchema, { 
      visibility,
      validateInvisibleFields: invisibleFieldValidation === 'validate',
      mode: invisibleFieldValidation,
    }),
    [zodSchema, visibility, invisibleFieldValidation]
  );

  // Initialize react-hook-form with Zod resolver
  const form = useForm<z.infer<typeof zodSchema>>({
    defaultValues: mergeDefaults(config, initialData),
    resolver,
    mode: props.mode || 'onChange',
  });
  
  // Watch all fields for visibility calculations
  const watchedValues = form.watch();
  
  // Update visibility when values change
  useEffect(() => {
    const newVisibility = calculateVisibility(config, watchedValues);
    if (!shallowEqual(visibility, newVisibility)) {
      setVisibility(newVisibility);
    }
  }, [watchedValues, config]);

  // Revalidate when visibility changes
  useEffect(() => {
    form.trigger();
  }, [visibility, form]);
  
  return (
    <FormProvider {...form}>
      <DynamicFormContext.Provider value={{ form, config, visibility, fieldComponents }}>
        <form onSubmit={form.handleSubmit(props.onSubmit)}>
          <FormRenderer elements={config.elements} />
        </form>
      </DynamicFormContext.Provider>
    </FormProvider>
  );
}
```

### 5.5 Field Registration with useController

Field components receive react-hook-form's controller props:

```typescript
import { useController, UseControllerProps } from 'react-hook-form';

function FieldRenderer({ config }: { config: FieldElement }) {
  const { form, fieldComponents, visibility } = useDynamicFormContext();
  
  // Skip rendering if not visible
  if (!visibility[config.name]) {
    return null;
  }
  
  const { field, fieldState } = useController({
    name: config.name,
    control: form.control,
  });
  
  const FieldComponent = fieldComponents[config.type];
  
  if (!FieldComponent) {
    console.warn(`No field component registered for type: ${config.type}`);
    return null;
  }
  
  return (
    <FieldComponent
      field={field}
      fieldState={fieldState}
      config={config}
    />
  );
}
```

### 5.6 Nested Path Support

Both react-hook-form and Zod natively support dot notation:

```typescript
// Configuration
{
  "type": "text",
  "name": "source.name",  // Dot notation path
  "label": "Name"
}

// Results in Zod schema structure:
z.object({
  source: z.object({
    name: z.string()
  })
})

// Results in form data structure:
{
  source: {
    name: "value"
  }
}

// Access via react-hook-form
form.getValues('source.name');
form.setValue('source.name', 'new value');
form.watch('source.name');
```

---

## 6. Field Component Interfaces

The library defines interfaces for field components. **Consuming applications must provide implementations**.

### 6.1 Base Field Props Interface

```typescript
import { 
  ControllerRenderProps, 
  ControllerFieldState,
  FieldPath,
  FieldValues 
} from 'react-hook-form';

/**
 * Base props passed to all field components.
 * Field components receive react-hook-form controller props.
 */
interface BaseFieldProps<TFieldValues extends FieldValues = FieldValues> {
  /** react-hook-form field props (value, onChange, onBlur, name, ref) */
  field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>;
  
  /** react-hook-form field state (invalid, isTouched, isDirty, error) */
  fieldState: ControllerFieldState;
  
  /** Field configuration from form config */
  config: FieldElement;
}
```

### 6.2 Text Field Interface

```typescript
/**
 * Props for text input field component.
 * 
 * @example
 * ```tsx
 * const TextInput: TextFieldComponent = ({ field, fieldState, config }) => (
 *   <div>
 *     <label>{config.label}</label>
 *     <input
 *       {...field}
 *       type="text"
 *       placeholder={config.placeholder}
 *     />
 *     {fieldState.error && <span>{fieldState.error.message}</span>}
 *   </div>
 * );
 * ```
 */
interface TextFieldProps extends BaseFieldProps {
  config: TextFieldElement;
}

type TextFieldComponent = React.ComponentType<TextFieldProps>;
```

### 6.3 Email Field Interface

```typescript
/**
 * Props for email input field component.
 * 
 * @example
 * ```tsx
 * const EmailInput: EmailFieldComponent = ({ field, fieldState, config }) => (
 *   <div>
 *     <label>{config.label}</label>
 *     <input
 *       {...field}
 *       type="email"
 *       placeholder={config.placeholder}
 *     />
 *     {fieldState.error && <span>{fieldState.error.message}</span>}
 *   </div>
 * );
 * ```
 */
interface EmailFieldProps extends BaseFieldProps {
  config: EmailFieldElement;
}

type EmailFieldComponent = React.ComponentType<EmailFieldProps>;
```

### 6.4 Boolean Field Interface

```typescript
/**
 * Props for boolean (checkbox/toggle) field component.
 * 
 * @example
 * ```tsx
 * const Checkbox: BooleanFieldComponent = ({ field, fieldState, config }) => (
 *   <div>
 *     <label>
 *       <input
 *         type="checkbox"
 *         checked={field.value}
 *         onChange={(e) => field.onChange(e.target.checked)}
 *         onBlur={field.onBlur}
 *         name={field.name}
 *         ref={field.ref}
 *       />
 *       {config.label}
 *     </label>
 *     {fieldState.error && <span>{fieldState.error.message}</span>}
 *   </div>
 * );
 * ```
 */
interface BooleanFieldProps extends BaseFieldProps {
  config: BooleanFieldElement;
}

type BooleanFieldComponent = React.ComponentType<BooleanFieldProps>;
```

### 6.5 Phone Field Interface

```typescript
/**
 * Props for phone input field component.
 * 
 * @example
 * ```tsx
 * const PhoneInput: PhoneFieldComponent = ({ field, fieldState, config }) => (
 *   <div>
 *     <label>{config.label}</label>
 *     <input
 *       {...field}
 *       type="tel"
 *       inputMode="numeric"
 *       placeholder={config.placeholder}
 *     />
 *     {fieldState.error && <span>{fieldState.error.message}</span>}
 *   </div>
 * );
 * ```
 */
interface PhoneFieldProps extends BaseFieldProps {
  config: PhoneFieldElement;
}

type PhoneFieldComponent = React.ComponentType<PhoneFieldProps>;
```

### 6.6 Date Field Interface

```typescript
/**
 * Props for date input field component.
 * 
 * @example
 * ```tsx
 * const DatePicker: DateFieldComponent = ({ field, fieldState, config }) => (
 *   <div>
 *     <label>{config.label}</label>
 *     <input
 *       {...field}
 *       type="date"
 *     />
 *     {fieldState.error && <span>{fieldState.error.message}</span>}
 *   </div>
 * );
 * ```
 */
interface DateFieldProps extends BaseFieldProps {
  config: DateFieldElement;
}

type DateFieldComponent = React.ComponentType<DateFieldProps>;
```

### 6.7 Custom Field Interface

```typescript
/**
 * Props for custom field components.
 * Custom components receive additional componentProps from configuration.
 * 
 * @example
 * ```tsx
 * const RichTextEditor: CustomFieldComponent = ({ field, fieldState, config }) => {
 *   const { minHeight, toolbar } = config.componentProps || {};
 *   return (
 *     <div>
 *       <label>{config.label}</label>
 *       <MyRichTextEditor
 *         value={field.value}
 *         onChange={field.onChange}
 *         minHeight={minHeight}
 *         toolbar={toolbar}
 *       />
 *       {fieldState.error && <span>{fieldState.error.message}</span>}
 *     </div>
 *   );
 * };
 * ```
 */
interface CustomFieldProps extends BaseFieldProps {
  config: CustomFieldElement;
}

type CustomFieldComponent = React.ComponentType<CustomFieldProps>;
```

### 6.8 Field Component Registry

```typescript
/**
 * Registry mapping field types to their component implementations.
 * All field types must be registered for the form to render properly.
 */
interface FieldComponentRegistry {
  text: TextFieldComponent;
  email: EmailFieldComponent;
  boolean: BooleanFieldComponent;
  phone: PhoneFieldComponent;
  date: DateFieldComponent;
}

/**
 * Registry for custom components referenced by name in configuration.
 */
type CustomComponentRegistry = Record<string, CustomFieldComponent>;
```

### 6.9 Complete Field Props Union

```typescript
/**
 * Union type for all field props.
 */
type FieldProps = 
  | TextFieldProps 
  | EmailFieldProps 
  | BooleanFieldProps 
  | PhoneFieldProps 
  | DateFieldProps 
  | CustomFieldProps;

/**
 * Generic field component type.
 */
type FieldComponent = React.ComponentType<FieldProps>;
```

---

## 7. Layout System

### 7.1 Container Element

Containers group elements and define column layouts.

```json
{
  "type": "container",
  "columns": [
    {
      "type": "column",
      "width": "50%",
      "elements": [/* fields */]
    },
    {
      "type": "column",
      "width": "50%",
      "elements": [/* fields */]
    }
  ],
  "visible": { "var": "showDetails" }
}
```

### 7.2 Container Component Interface

```typescript
interface ContainerProps {
  config: ContainerElement;
  children: React.ReactNode;
}

/**
 * Default container renderer.
 * Can be overridden via customContainers prop.
 */
const Container: React.FC<ContainerProps> = ({ config, children }) => (
  <div 
    className="df-container"
    style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}
  >
    {children}
  </div>
);
```

### 7.3 Column Component Interface

```typescript
interface ColumnProps {
  config: ColumnElement;
  children: React.ReactNode;
}

/**
 * Default column renderer.
 */
const Column: React.FC<ColumnProps> = ({ config, children }) => (
  <div 
    className="df-column"
    style={{ width: config.width, flexShrink: 0 }}
  >
    {children}
  </div>
);
```

### 7.4 Nested Layouts

Layouts can be nested to create complex form structures:

```json
{
  "type": "container",
  "columns": [
    {
      "type": "column",
      "width": "60%",
      "elements": [
        {
          "type": "container",
          "columns": [
            {
              "type": "column",
              "width": "50%",
              "elements": [
                { "type": "text", "name": "contact.firstName", "label": "First Name" }
              ]
            },
            {
              "type": "column",
              "width": "50%",
              "elements": [
                { "type": "text", "name": "contact.lastName", "label": "Last Name" }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "column",
      "width": "40%",
      "elements": [
        { "type": "email", "name": "contact.email", "label": "Email" }
      ]
    }
  ]
}
```

---

## 8. Validation System

### 8.1 Overview

The library supports flexible validation with three approaches, applied in priority order:

1. **External Resolver** (`resolver` prop) - Full control with any validation library
2. **External Zod Schema** (`schema` prop) - Your Zod schema with visibility-aware wrapping
3. **Config-Driven** (default) - Auto-generated Zod schema from field `validation` configs

If no validation is provided (no `resolver`, no `schema`, no `validation` in config), the form runs without validation.

### 8.2 Validation Approaches

#### Option 1: External Resolver (Full Control)

Use any validation library (Yup, Joi, Vest, custom) by passing a react-hook-form resolver:

```tsx
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  name: yup.string().required(),
  email: yup.string().email().required(),
});

<DynamicForm
  config={config}
  resolver={yupResolver(schema)}
  fieldComponents={fieldComponents}
  onSubmit={handleSubmit}
/>
```

#### Option 2: External Zod Schema (Visibility-Aware)

Pass your own Zod schema - it will be wrapped with the visibility-aware resolver:

```tsx
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
});

<DynamicForm
  config={config}
  schema={schema}
  invisibleFieldValidation="skip"
  fieldComponents={fieldComponents}
  onSubmit={handleSubmit}
/>
```

#### Option 3: Config-Driven Validation (Default)

Define validation rules in the form configuration - schemas are auto-generated:

```tsx
const config = {
  elements: [
    {
      type: 'text',
      name: 'name',
      label: 'Name',
      validation: { required: true, minLength: 2 }
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email',
      validation: { required: true }
    }
  ]
};

<DynamicForm
  config={config}
  fieldComponents={fieldComponents}
  onSubmit={handleSubmit}
/>
```

#### Option 4: No Validation

For forms that don't need validation:

```tsx
<DynamicForm
  config={simpleConfig}
  fieldComponents={fieldComponents}
  onSubmit={handleSubmit}
/>
```

### 8.3 Schema Generation Architecture

The library can generate Zod schemas dynamically from form configuration. This provides:

- **Type-safe validation** with automatic TypeScript inference
- **Seamless react-hook-form integration** via `@hookform/resolvers/zod`
- **Composable validation rules** that can be extended
- **JSON Logic support** through Zod's `refine` and `superRefine` methods
- **Stable schema** - generated once, visibility handled at validation time

### 8.4 Dependencies

```typescript
import { z, ZodTypeAny, ZodObject } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import jsonLogic from 'json-logic-js';
```

### 8.3 Schema Generation from Configuration

```typescript
/**
 * Generate a Zod schema from form configuration.
 * Supports nested field paths via dot notation.
 */
function generateZodSchema(config: FormConfiguration): ZodObject<any> {
  const fields = flattenFields(config.elements);
  const schemaShape: Record<string, ZodTypeAny> = {};

  for (const field of fields) {
    const fieldSchema = buildFieldSchema(field);
    setNestedSchema(schemaShape, field.name, fieldSchema);
  }

  return z.object(schemaShape);
}

/**
 * Build Zod schema for a single field based on its type and validation config.
 */
function buildFieldSchema(field: FieldElement): ZodTypeAny {
  let schema: ZodTypeAny;

  // Base schema by field type
  switch (field.type) {
    case 'text':
    case 'phone':
      schema = z.string();
      break;
    case 'email':
      schema = z.string().email('Invalid email address');
      break;
    case 'boolean':
      schema = z.boolean();
      break;
    case 'date':
      schema = z.string().refine(
        (val) => !val || !isNaN(Date.parse(val)),
        { message: 'Invalid date' }
      );
      break;
    default:
      schema = z.unknown();
  }

  // Apply validation rules
  if (field.validation) {
    schema = applyValidationRules(schema, field.validation, field.type);
  }

  return schema;
}

/**
 * Apply validation configuration to a Zod schema.
 */
function applyValidationRules(
  schema: ZodTypeAny,
  validation: ValidationConfig,
  fieldType: string
): ZodTypeAny {
  // For string-based fields
  if (fieldType === 'text' || fieldType === 'phone' || fieldType === 'email') {
    let stringSchema = schema as z.ZodString;

    if (validation.required) {
      stringSchema = stringSchema.min(1, 'This field is required');
    }

    if (validation.minLength !== undefined) {
      stringSchema = stringSchema.min(
        validation.minLength,
        `Must be at least ${validation.minLength} characters`
      );
    }

    if (validation.maxLength !== undefined) {
      stringSchema = stringSchema.max(
        validation.maxLength,
        `Must be no more than ${validation.maxLength} characters`
      );
    }

    if (validation.pattern) {
      stringSchema = stringSchema.regex(
        new RegExp(validation.pattern),
        validation.message || 'Invalid format'
      );
    }

    return stringSchema;
  }

  // For boolean fields
  if (fieldType === 'boolean' && validation.required) {
    return (schema as z.ZodBoolean).refine((val) => val === true, {
      message: 'This field is required',
    });
  }

  return schema;
}
```

### 8.4 Handling Nested Field Paths

Support for dot-notation paths like `source.name`, `source.email`:

```typescript
/**
 * Set a nested schema value using dot notation path.
 * Example: setNestedSchema(shape, 'source.name', z.string())
 * Results in: { source: z.object({ name: z.string() }) }
 */
function setNestedSchema(
  shape: Record<string, ZodTypeAny>,
  path: string,
  schema: ZodTypeAny
): void {
  const parts = path.split('.');
  
  if (parts.length === 1) {
    shape[path] = schema;
    return;
  }

  const [first, ...rest] = parts;
  
  if (!shape[first]) {
    shape[first] = z.object({});
  }

  // Get the inner shape of the existing object schema
  const existingSchema = shape[first] as z.ZodObject<any>;
  const innerShape = { ...existingSchema.shape };
  
  // Recursively set the nested path
  setNestedSchema(innerShape, rest.join('.'), schema);
  
  // Rebuild the object schema with updated shape
  shape[first] = z.object(innerShape);
}

/**
 * Get value from nested object using dot notation.
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
```

### 8.5 JSON Logic Integration with Zod

For complex validation rules using JSON Logic `condition`:

```typescript
// Register custom regex_match operation for JSON Logic
jsonLogic.add_operation('regex_match', (pattern: string, fieldPath: string) => {
  // Note: fieldPath is a string path, value will be resolved from context
  const value = getNestedValue((jsonLogic as any)._data, fieldPath);
  if (typeof value !== 'string') return false;
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return false;
  }
});

/**
 * Create a Zod schema with JSON Logic conditions applied via superRefine.
 * This allows cross-field validation based on the entire form data.
 */
function generateZodSchemaWithConditions(config: FormConfiguration): ZodObject<any> {
  // First, generate base schema
  const baseSchema = generateZodSchema(config);
  
  // Collect fields with JSON Logic conditions
  const fieldsWithConditions = flattenFields(config.elements)
    .filter(field => field.validation?.condition);

  if (fieldsWithConditions.length === 0) {
    return baseSchema;
  }

  // Apply superRefine for cross-field validation
  return baseSchema.superRefine((data, ctx) => {
    // Set data context for JSON Logic
    (jsonLogic as any)._data = data;
    
    // Get visibility from refinement context if available
    const visibility = (ctx as any)._visibility || {};
    const validateInvisible = (ctx as any)._validateInvisibleFields || false;

    for (const field of fieldsWithConditions) {
      // Skip validation for invisible fields unless configured otherwise
      if (!validateInvisible && visibility[field.name] === false) {
        continue;
      }

      const condition = field.validation!.condition!;
      const isValid = jsonLogic.apply(condition, data);

      if (!isValid) {
        const pathParts = field.name.split('.');
        
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: field.validation?.message || 'Validation failed',
          path: pathParts,
        });
      }
    }
  });
}
```

### 8.6 Visibility-Aware Resolver

The schema is generated once and remains stable. Visibility is passed as a parameter to the resolver and evaluated at validation time:

```typescript
/**
 * Validation options that can be changed at runtime without regenerating schema.
 */
interface ValidationOptions {
  /** Current visibility state of all fields */
  visibility: Record<string, boolean>;
  
  /** If true, validate invisible fields as well (default: false) */
  validateInvisibleFields?: boolean;
  
  /** Validation mode for invisible fields */
  mode?: 'skip' | 'validate' | 'warn';
}

/**
 * Create a custom resolver that wraps Zod resolver with visibility awareness.
 * The schema is generated once; visibility is evaluated at validation time.
 */
function createVisibilityAwareResolver(
  schema: z.ZodObject<any>,
  options: ValidationOptions
): Resolver<any> {
  return async (values, context, resolverOptions) => {
    // Create parse context with visibility information
    const parseContext = {
      _visibility: options.visibility,
      _validateInvisibleFields: options.validateInvisibleFields || false,
    };

    try {
      const result = await schema.safeParseAsync(values);

      if (result.success) {
        return { values: result.data, errors: {} };
      }

      // Convert Zod errors to react-hook-form format, filtering by visibility
      const errors = convertZodErrors(
        result.error, 
        options.visibility, 
        options.validateInvisibleFields,
        options.mode
      );
      
      return {
        values: Object.keys(errors).length === 0 ? values : {},
        errors,
      };
    } catch (error) {
      return {
        values: {},
        errors: { root: { type: 'validation', message: 'Validation failed' } },
      };
    }
  };
}

/**
 * Convert Zod errors to react-hook-form format, filtering by visibility.
 */
function convertZodErrors(
  zodError: z.ZodError,
  visibility: Record<string, boolean>,
  validateInvisibleFields?: boolean,
  mode?: 'skip' | 'validate' | 'warn'
): Record<string, { type: string; message: string }> {
  const errors: Record<string, { type: string; message: string }> = {};
  const warnings: Record<string, { type: string; message: string }> = {};

  for (const issue of zodError.issues) {
    const path = issue.path.join('.');
    const isVisible = visibility[path] !== false;
    
    if (isVisible) {
      errors[path] = {
        type: issue.code,
        message: issue.message,
      };
    } else if (validateInvisibleFields || mode === 'validate') {
      errors[path] = {
        type: issue.code,
        message: issue.message,
      };
    } else if (mode === 'warn') {
      warnings[path] = {
        type: issue.code,
        message: issue.message,
      };
    }
    // 'skip' mode: invisible field errors are discarded
  }

  // Log warnings if any
  if (mode === 'warn' && Object.keys(warnings).length > 0) {
    console.warn('Validation warnings for invisible fields:', warnings);
  }

  return errors;
}
```

### 8.7 Configurable Visibility Validation Behavior

Allow the consuming application to control whether invisible fields are validated:

```typescript
interface DynamicFormProps {
  // ... existing props
  
  /**
   * Controls validation behavior for invisible fields.
   * - 'skip': Do not validate invisible fields (default)
   * - 'validate': Validate all fields regardless of visibility
   * - 'warn': Validate but treat errors as warnings (non-blocking)
   */
  invisibleFieldValidation?: 'skip' | 'validate' | 'warn';
}
```

### 8.8 Dependent Validation Example

From the specification - phone number validation that depends on `has_phone` field:

```json
{
  "type": "phone",
  "name": "source.phone",
  "label": "Phone Number",
  "visible": {
    "var": "source.has_phone"
  },
  "validation": {
    "condition": {
      "or": [
        {
          "and": [
            { "var": "source.has_phone" },
            { "regex_match": ["^[0-9]{10}$", "source.phone"] }
          ]
        },
        { "!": { "var": "source.has_phone" } }
      ]
    },
    "message": "Please enter a valid 10-digit phone number"
  }
}
```

**Logic explanation:**
- If `source.has_phone` is true AND phone matches 10-digit pattern → valid
- OR if `source.has_phone` is false → valid
- This means: phone is only required to match pattern when has_phone is checked

### 8.9 Complete Schema Generation Example

Given this configuration:

```json
{
  "elements": [
    {
      "type": "text",
      "name": "source.name",
      "label": "Name",
      "validation": {
        "required": true,
        "minLength": 3,
        "maxLength": 100
      }
    },
    {
      "type": "boolean",
      "name": "source.has_phone",
      "label": "Has Phone Number"
    },
    {
      "type": "phone",
      "name": "source.phone",
      "label": "Phone Number",
      "validation": {
        "condition": {
          "or": [
            {
              "and": [
                { "var": "source.has_phone" },
                { "regex_match": ["^[0-9]{10}$", "source.phone"] }
              ]
            },
            { "!": { "var": "source.has_phone" } }
          ]
        },
        "message": "Please enter a valid 10-digit phone number"
      }
    }
  ]
}
```

The generated Zod schema would be equivalent to:

```typescript
const generatedSchema = z.object({
  source: z.object({
    name: z.string()
      .min(1, 'This field is required')
      .min(3, 'Must be at least 3 characters')
      .max(100, 'Must be no more than 100 characters'),
    has_phone: z.boolean(),
    phone: z.string(),
  })
}).superRefine((data, ctx) => {
  // Get visibility from context
  const visibility = (ctx as any)._visibility || {};
  const validateInvisible = (ctx as any)._validateInvisibleFields || false;
  
  // Skip if field is not visible and we're not validating invisible fields
  if (!validateInvisible && visibility['source.phone'] === false) {
    return;
  }
  
  // JSON Logic condition for phone field
  const hasPhone = data.source?.has_phone;
  const phone = data.source?.phone || '';
  
  const isValid = !hasPhone || /^[0-9]{10}$/.test(phone);
  
  if (!isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please enter a valid 10-digit phone number',
      path: ['source', 'phone'],
    });
  }
});
```

### 8.10 Custom Zod Validators

Extend Zod with reusable custom validators:

```typescript
// Custom phone number validator
const phoneNumber = z.string().refine(
  (val) => /^[0-9]{10}$/.test(val),
  { message: 'Must be a valid 10-digit phone number' }
);

// Custom email with domain restriction
const corporateEmail = (domain: string) => 
  z.string()
    .email()
    .refine(
      (val) => val.endsWith(`@${domain}`),
      { message: `Must be a ${domain} email address` }
    );

// Registry for custom validators
const customValidators: Record<string, ZodTypeAny> = {
  phoneNumber,
  corporateEmail: corporateEmail('company.com'),
};
```

---

## 9. Visibility Control System

### 9.1 Basic Visibility

Control field visibility with JSON Logic expressions:

```json
{
  "type": "phone",
  "name": "source.phone",
  "label": "Phone Number",
  "visible": {
    "var": "source.has_phone"
  }
}
```

### 9.2 Visibility Calculator

```typescript
import jsonLogic from 'json-logic-js';

/**
 * Calculate visibility state for all fields based on current form values.
 */
function calculateVisibility(
  config: FormConfiguration,
  values: FormData
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};

  function processElement(element: FormElement, parentVisible: boolean): void {
    let isVisible = parentVisible;

    // Evaluate element's own visibility rule
    if ('visible' in element && element.visible) {
      isVisible = parentVisible && Boolean(jsonLogic.apply(element.visible, values));
    }

    // Store visibility for named elements (fields)
    if ('name' in element && element.name) {
      visibility[element.name] = isVisible;
    }

    // Process nested elements
    if ('elements' in element && element.elements) {
      for (const child of element.elements) {
        processElement(child, isVisible);
      }
    }

    // Process columns in containers
    if ('columns' in element && element.columns) {
      for (const column of element.columns) {
        processElement(column, isVisible);
      }
    }
  }

  // Process all top-level elements
  for (const element of config.elements) {
    processElement(element, true);
  }

  return visibility;
}
```

### 9.3 Integration with Validation

Visibility is passed as a parameter to the validation resolver, not used to regenerate the schema. This design allows:

1. **Stable schema** - Generated once at initialization
2. **Runtime flexibility** - Visibility evaluated at validation time
3. **Future extensibility** - Can validate invisible fields if needed via `invisibleFieldValidation` prop

```typescript
function DynamicForm({ config, invisibleFieldValidation = 'skip', ...props }: DynamicFormProps) {
  // Generate schema ONCE from configuration
  const zodSchema = useMemo(
    () => generateZodSchemaWithConditions(config),
    [config]
  );

  // Track visibility state
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => 
    calculateVisibility(config, props.initialData || {})
  );

  // Create resolver with current visibility (updates when visibility changes)
  const resolver = useMemo(
    () => createVisibilityAwareResolver(zodSchema, { 
      visibility,
      validateInvisibleFields: invisibleFieldValidation === 'validate',
      mode: invisibleFieldValidation,
    }),
    [zodSchema, visibility, invisibleFieldValidation]
  );

  // ... rest of implementation
}
```

### 9.4 Container/Column Visibility

Visibility rules apply to containers and columns, affecting all nested elements:

```json
{
  "type": "container",
  "visible": {
    "==": [{ "var": "userType" }, "business"]
  },
  "columns": [
    {
      "type": "column",
      "width": "100%",
      "elements": [
        { "type": "text", "name": "company.name", "label": "Company Name" },
        { "type": "text", "name": "company.taxId", "label": "Tax ID" }
      ]
    }
  ]
}
```

When container visibility is false, all nested fields are also marked as not visible in the visibility map.

### 9.5 Utility Functions

```typescript
/**
 * Shallow equality check for visibility objects.
 */
function shallowEqual(
  a: Record<string, boolean>, 
  b: Record<string, boolean>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => a[key] === b[key]);
}
```

### 9.5 Field Dependencies

The library supports cascading field dependencies where changing a parent field automatically resets dependent child fields.

#### Configuration

```typescript
const config: FormConfiguration = {
  elements: [
    {
      type: 'select',
      name: 'country',
      label: 'Country',
      options: [
        { value: 'us', label: 'United States' },
        { value: 'ca', label: 'Canada' },
      ],
    },
    {
      type: 'select',
      name: 'city',
      label: 'City',
      options: [], // Options loaded dynamically
      dependsOn: 'country', // Depends on country field
      resetOnParentChange: true, // Reset when country changes (default: true)
    },
  ],
};
```

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `dependsOn` | `string` | - | Field path this field depends on |
| `resetOnParentChange` | `boolean` | `true` | Reset to default when parent changes |

#### Behavior

1. When a parent field value changes, all dependent fields are automatically reset to their default values
2. The reset respects `resetOnParentChange` - set to `false` to preserve values
3. Chained dependencies work correctly (country → state → city)
4. Dependencies are processed in a single form.watch subscription for efficiency

#### Example: Cascading Selects

```tsx
// Sample SelectField component with dependency handling
const SelectField: SelectFieldComponent = ({ field, fieldState, config, formValues }) => {
  const parentValue = config.dependsOn
    ? getNestedValue(formValues, config.dependsOn)
    : null;

  // Filter options based on parent value
  const options = config.dependsOn && !parentValue
    ? [] // No options when parent not selected
    : filterOptionsByParent(config.options, parentValue);

  const isDisabled = Boolean(config.dependsOn && !parentValue);

  return (
    <select {...field} disabled={isDisabled}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};
```

---

## 10. Event Handling

### 10.1 Available Events

```typescript
interface DynamicFormProps {
  /** Called when form is submitted with valid data */
  onSubmit: (data: FormData) => void | Promise<void>;
  
  /** Called when form values change */
  onChange?: (data: FormData, changedField: string) => void;
  
  /** Called when validation state changes */
  onValidationChange?: (errors: FieldErrors, isValid: boolean) => void;
  
  /** Called when form is reset */
  onReset?: () => void;
  
  /** Called on form submission error */
  onError?: (errors: FieldErrors) => void;
}
```

### 10.2 onChange Implementation

```typescript
function DynamicForm({ config, onChange, onSubmit, ...props }: DynamicFormProps) {
  const form = useForm<FormData>({ ... });
  
  // Subscribe to value changes
  useEffect(() => {
    if (!onChange) return;
    
    const subscription = form.watch((values, { name }) => {
      if (name) {
        onChange(values as FormData, name);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, onChange]);
  
  // ...
}
```

### 10.3 onSubmit Integration

```typescript
function DynamicForm({ config, onSubmit, onError, ...props }: DynamicFormProps) {
  const form = useForm<FormData>({ ... });
  
  const handleSubmit = form.handleSubmit(
    // Success handler
    async (data) => {
      await onSubmit(data);
    },
    // Error handler
    (errors) => {
      onError?.(errors);
    }
  );
  
  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  );
}
```

---

## 11. Custom Components

### 11.1 Custom Field Components

The library provides a type-safe system for registering custom field components with optional prop validation using Zod schemas.

#### Basic Custom Component

Register a simple custom component:

```typescript
import type { CustomComponentRenderProps } from 'dynamic-forms';

// Define custom component with typed props
const RichTextEditor = ({
  field,
  fieldState,
  config,
  componentProps,
}: CustomComponentRenderProps<{ minHeight?: number; toolbar?: string[] }>) => {
  return (
    <div className="rich-text-field">
      {config.label && <label>{config.label}</label>}
      <MyRichTextLibrary
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        minHeight={componentProps.minHeight}
        toolbar={componentProps.toolbar}
      />
      {fieldState.error && (
        <span className="error">{fieldState.error.message}</span>
      )}
    </div>
  );
};

// Register as simple component
const customComponents = {
  richText: RichTextEditor,
};
```

#### Custom Component with Schema Validation

Use `defineCustomComponent` for type-safe component definitions with prop validation:

```typescript
import { defineCustomComponent } from 'dynamic-forms';
import { z } from 'zod/v4';

// Define component with Zod schema for props validation
const RatingField = defineCustomComponent({
  component: ({ field, componentProps }) => (
    <div className="rating-field">
      {[...Array(componentProps.maxStars)].map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => field.onChange(i + 1)}
          className={i < (field.value as number) ? 'active' : ''}
        >
          ★
        </button>
      ))}
    </div>
  ),
  propsSchema: z.object({
    maxStars: z.number().int().min(1).max(10).default(5),
    showValue: z.boolean().default(true),
  }),
  defaultProps: {
    maxStars: 5,
  },
  displayName: 'RatingField',
  description: 'Star rating input component',
});

// Register with full definition
const customComponents = {
  RatingField,
};
```

#### Using Custom Components in Configuration

```typescript
const config = {
  elements: [
    {
      type: "custom",
      component: "RatingField",
      name: "rating",
      label: "Rate your experience",
      componentProps: {
        maxStars: 10,
        showValue: true,
      },
    },
    {
      type: "custom",
      component: "richText",
      name: "description",
      label: "Description",
      componentProps: {
        minHeight: 200,
        toolbar: ["bold", "italic", "link"],
      },
    },
  ],
};

<DynamicForm
  config={config}
  customComponents={customComponents}
  fieldComponents={fieldComponents}
  onSubmit={handleSubmit}
/>
```

#### CustomComponentRenderProps Interface

All custom components receive these props:

```typescript
interface CustomComponentRenderProps<TProps = Record<string, unknown>> {
  /** react-hook-form field controller */
  field: ControllerRenderProps;
  /** Field validation state */
  fieldState: ControllerFieldState;
  /** Field configuration from JSON */
  config: CustomFieldElement;
  /** Validated component props (merged with defaults) */
  componentProps: TProps;
  /** Current form values */
  formValues: FormData;
  /** Function to set other field values */
  setValue: (name: string, value: unknown) => void;
}
```

#### Configuration Validation Errors

Invalid component configurations throw `ConfigurationError`:

```typescript
import { ConfigurationError } from 'dynamic-forms';

try {
  // This will throw if RatingField.propsSchema validation fails
  <DynamicForm config={config} customComponents={customComponents} />
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error(`Error at ${error.path}: ${error.message}`);
    console.error(`Component: ${error.component}`);
  }
}
```

### 11.2 Custom Container Components

Override default container rendering:

```typescript
interface CustomContainerProps {
  config: ContainerElement;
  children: React.ReactNode;
}

const CardContainer: React.FC<CustomContainerProps> = ({ config, children }) => (
  <div className="card-container">
    <div className="card-body">
      {children}
    </div>
  </div>
);

<DynamicForm
  config={config}
  customContainers={{ card: CardContainer }}
/>
```

---

## 12. Implementation Guide

### 12.1 Implementation Phases

As defined in the specification:

#### Phase 1: Configuration Parsing and Basic Rendering

**Goal:** Basic version of library that supports rendering elements one under another from built-in elements library and render custom ones passed as props to `DynamicForm` component. Firing events on form data changing.

**Tasks:**
- Configuration parser with schema validation
- Field component registry
- Basic `DynamicForm` component with react-hook-form integration
- Basic Zod schema generation from configuration
- `onChange` event firing on field changes
- Support for custom components via props

**Deliverables:**
- `DynamicForm` renders fields from configuration
- Field components receive react-hook-form controller props
- `onChange` callback fires on value changes
- Zod schema generated from basic field types

#### Phase 2: Containers Rendering and Configuration

**Goal:** Provide a way to visually group elements together, add container element that supports rendering child elements, add support to custom container elements.

**Tasks:**
- `Container` component implementation
- `Column` component implementation
- Recursive element renderer for nested layouts
- Custom container component support
- Nested Zod schema generation for field paths

**Deliverables:**
- Container/Column layout working
- Nested layouts supported
- Custom containers can be plugged in
- Nested field paths properly mapped to Zod schema

#### Phase 3: Declarative Validation

**Goal:** Add declarative validation support: built-in validators, declarative validation using JSON-logic integrated with Zod.

**Tasks:**
- Built-in validators via Zod (required, minLength, maxLength, pattern, type)
- JSON Logic integration via Zod's `superRefine`
- Custom `regex_match` JSON Logic operation
- Visibility-aware resolver (visibility as parameter)
- Configurable `invisibleFieldValidation` prop

**Deliverables:**
- All built-in validators working via Zod
- JSON Logic validation integrated with Zod's superRefine
- Validation errors displayed via field components
- Invisible field validation behavior configurable

#### Phase 4: Declarative Visibility Control

**Goal:** Add conditional visibility support based on JSON-logic expressions.

**Tasks:**
- Visibility calculator using JSON Logic
- Integration with `form.watch()` for reactive updates
- Container/column visibility inheritance
- Integration with visibility-aware resolver

**Deliverables:**
- Conditional visibility working
- Container/section visibility
- Visibility passed to validation resolver

### 12.2 Project Structure

```
dynamic-form/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Main exports
│   ├── DynamicForm.tsx             # Main component
│   │
│   ├── types/
│   │   ├── index.ts                # Type exports
│   │   ├── config.ts               # Configuration types
│   │   ├── elements.ts             # Element types
│   │   ├── fields.ts               # Field component interfaces
│   │   ├── validation.ts           # Validation types
│   │   └── events.ts               # Event handler types
│   │
│   ├── context/
│   │   ├── index.ts                # Context exports
│   │   └── DynamicFormContext.tsx  # Form context
│   │
│   ├── hooks/
│   │   ├── index.ts                # Hook exports
│   │   ├── useDynamicFormContext.ts
│   │   └── useFieldVisibility.ts
│   │
│   ├── components/
│   │   ├── index.ts                # Component exports
│   │   ├── FormRenderer.tsx        # Main renderer
│   │   ├── ElementRenderer.tsx     # Element dispatcher
│   │   ├── FieldRenderer.tsx       # Field wrapper
│   │   ├── Container.tsx           # Container layout
│   │   └── Column.tsx              # Column layout
│   │
│   ├── schema/
│   │   ├── index.ts                # Schema exports
│   │   ├── generateSchema.ts       # Zod schema generation
│   │   ├── nestedPaths.ts          # Nested path utilities
│   │   └── fieldSchemas.ts         # Per-field-type schema builders
│   │
│   ├── validation/
│   │   ├── index.ts                # Validation exports
│   │   ├── visibilityAwareResolver.ts  # Custom resolver
│   │   ├── jsonLogicIntegration.ts     # JSON Logic + Zod
│   │   └── jsonLogicOperations.ts      # Custom JSON Logic ops
│   │
│   ├── visibility/
│   │   ├── index.ts                # Visibility exports
│   │   └── calculateVisibility.ts  # Visibility logic
│   │
│   ├── parser/
│   │   ├── index.ts                # Parser exports
│   │   ├── configParser.ts         # Configuration parser
│   │   └── configValidator.ts      # Schema validation
│   │
│   └── utils/
│       ├── index.ts                # Utility exports
│       ├── flattenFields.ts        # Flatten nested elements
│       ├── mergeDefaults.ts        # Merge default values
│       └── shallowEqual.ts         # Shallow equality check
│
└── __tests__/
    ├── DynamicForm.test.tsx
    ├── schemaGeneration.test.ts
    ├── validation.test.ts
    └── visibility.test.ts
```

---

## 13. Integration Guide

### 13.1 Template Editor Integration

The Template Editor uses its own configuration format. A converter is required:

```typescript
interface TemplateEditorField {
  id: string;
  fieldType: 'STRING' | 'EMAIL' | 'PHONE' | 'BOOLEAN' | 'DATE';
  label: string;
  mandatory: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

interface TemplateEditorConfig {
  title: string;
  fields: TemplateEditorField[];
}

/**
 * Convert Template Editor configuration to Dynamic Form configuration.
 */
function convertFromTemplateEditor(
  templateConfig: TemplateEditorConfig
): FormConfiguration {
  const typeMap: Record<string, ElementType> = {
    'STRING': 'text',
    'EMAIL': 'email',
    'PHONE': 'phone',
    'BOOLEAN': 'boolean',
    'DATE': 'date',
  };
  
  return {
    name: templateConfig.title,
    elements: templateConfig.fields.map(field => ({
      type: typeMap[field.fieldType] || 'text',
      name: field.id,
      label: field.label,
      validation: {
        required: field.mandatory,
        minLength: field.validation?.minLength,
        maxLength: field.validation?.maxLength,
        pattern: field.validation?.pattern,
      },
    })),
  };
}
```

### 13.2 Ontology Data Editor Integration

The Ontology Data Editor uses property-based configuration:

```typescript
interface OntologyProperty {
  propertyId: string;
  displayName: string;
  dataType: 'string' | 'email' | 'boolean' | 'date' | 'phone';
  constraints?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

interface OntologyConfig {
  entityType: string;
  properties: OntologyProperty[];
}

/**
 * Convert Ontology Data Editor configuration to Dynamic Form configuration.
 */
function convertFromOntologyEditor(
  ontologyConfig: OntologyConfig
): FormConfiguration {
  const typeMap: Record<string, ElementType> = {
    'string': 'text',
    'email': 'email',
    'phone': 'phone',
    'boolean': 'boolean',
    'date': 'date',
  };
  
  return {
    name: ontologyConfig.entityType,
    elements: ontologyConfig.properties.map(prop => ({
      type: typeMap[prop.dataType] || 'text',
      name: prop.propertyId,
      label: prop.displayName,
      validation: prop.constraints ? {
        required: prop.constraints.required,
        minLength: prop.constraints.minLength,
        maxLength: prop.constraints.maxLength,
        pattern: prop.constraints.pattern,
      } : undefined,
    })),
  };
}
```

### 13.3 Generic Converter Interface

```typescript
/**
 * Interface for configuration converters.
 * Implement this to integrate with other configuration sources.
 */
interface ConfigurationConverter<TSource> {
  /**
   * Convert external configuration to Dynamic Form configuration.
   */
  convert(source: TSource): FormConfiguration;
  
  /**
   * Validate external configuration before conversion.
   */
  validate?(source: unknown): source is TSource;
}

// Usage
const templateEditorConverter: ConfigurationConverter<TemplateEditorConfig> = {
  convert: convertFromTemplateEditor,
  validate: (source): source is TemplateEditorConfig => {
    return typeof source === 'object' && 
           source !== null && 
           'fields' in source;
  },
};
```

---

## 14. TypeScript Type Definitions

### 14.1 Complete Type Definitions

```typescript
import { z, ZodTypeAny, ZodObject } from 'zod';
import { 
  ControllerRenderProps, 
  ControllerFieldState,
  FieldPath,
  FieldValues,
  FieldErrors,
  Resolver
} from 'react-hook-form';

// ============================================
// JSON Logic Types
// ============================================

export type JsonLogicRule = Record<string, unknown>;

// ============================================
// Element Types (as per specification)
// ============================================

export type ElementType = 
  | 'text' 
  | 'email' 
  | 'boolean' 
  | 'phone' 
  | 'date' 
  | 'container' 
  | 'column' 
  | 'custom';

export type FieldType = 'text' | 'email' | 'boolean' | 'phone' | 'date';

// ============================================
// Validation Types
// ============================================

export interface ValidationConfig {
  required?: boolean;
  type?: 'number' | 'email' | 'date';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  condition?: JsonLogicRule;
  message?: string;
}

export type InvisibleFieldValidation = 'skip' | 'validate' | 'warn';

export interface ValidationOptions {
  visibility: Record<string, boolean>;
  validateInvisibleFields?: boolean;
  mode?: InvisibleFieldValidation;
}

// ============================================
// Field Element Types
// ============================================

interface BaseFieldElement {
  name: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean | null;
  validation?: ValidationConfig;
  visible?: JsonLogicRule;
  /** Field path this field depends on (for cascading selects) */
  dependsOn?: string;
  /** Reset this field when parent changes (default: true) */
  resetOnParentChange?: boolean;
}

export interface TextFieldElement extends BaseFieldElement {
  type: 'text';
}

export interface EmailFieldElement extends BaseFieldElement {
  type: 'email';
}

export interface BooleanFieldElement extends BaseFieldElement {
  type: 'boolean';
}

export interface PhoneFieldElement extends BaseFieldElement {
  type: 'phone';
}

export interface DateFieldElement extends BaseFieldElement {
  type: 'date';
}

export interface CustomFieldElement extends BaseFieldElement {
  type: 'custom';
  component: string;
  componentProps?: Record<string, unknown>;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldElement extends BaseFieldElement {
  type: 'select';
  /** Available options */
  options: SelectOption[];
  /** Allow selecting multiple values (default: false) */
  multiple?: boolean;
  /** Allow clearing selection (default: true) */
  clearable?: boolean;
  /** Allow searching/filtering options (default: false) */
  searchable?: boolean;
  /** Allow creating new options (default: false) */
  creatable?: boolean;
}

export interface ArrayFieldElement extends BaseFieldElement {
  type: 'array';
  /** Fields template for each item */
  itemFields: FieldElement[];
  /** Minimum items required */
  minItems?: number;
  /** Maximum items allowed */
  maxItems?: number;
  /** Label for add button */
  addButtonLabel?: string;
  /** Allow reordering items */
  sortable?: boolean;
}

export type FieldElement =
  | TextFieldElement
  | EmailFieldElement
  | BooleanFieldElement
  | PhoneFieldElement
  | DateFieldElement
  | SelectFieldElement
  | ArrayFieldElement
  | CustomFieldElement;

// ============================================
// Layout Element Types
// ============================================

export interface ContainerElement {
  type: 'container';
  columns: ColumnElement[];
  visible?: JsonLogicRule;
}

export interface ColumnElement {
  type: 'column';
  width: string;
  elements: FormElement[];
  visible?: JsonLogicRule;
}

export type LayoutElement = ContainerElement | ColumnElement;

// ============================================
// Union Types
// ============================================

export type FormElement = FieldElement | LayoutElement;

// ============================================
// Configuration Types
// ============================================

export interface CustomComponentDefinition<
  TProps extends Record<string, unknown> = Record<string, unknown>
> {
  /** The React component to render */
  component: React.ComponentType<CustomComponentRenderProps<TProps>>;
  /** Optional Zod schema to validate componentProps */
  propsSchema?: ZodObject<ZodRawShape>;
  /** Default values for componentProps */
  defaultProps?: Partial<TProps>;
  /** Human-readable description */
  description?: string;
  /** Display name for debugging */
  displayName?: string;
}

export interface CustomComponentRenderProps<
  TProps extends Record<string, unknown> = Record<string, unknown>
> {
  field: ControllerRenderProps;
  fieldState: ControllerFieldState;
  config: CustomFieldElement;
  componentProps: TProps;
  formValues: FormData;
  setValue: (name: string, value: unknown) => void;
}

export type CustomComponentRegistry = Record<
  string,
  CustomComponentDefinition | React.ComponentType<CustomComponentRenderProps>
>;

export class ConfigurationError extends Error {
  readonly path?: string;
  readonly component?: string;
  constructor(message: string, path?: string, component?: string);
  static formatMessage(message: string, path?: string, component?: string): string;
}

export interface FormConfiguration {
  name?: string;
  elements: FormElement[];
  customComponents?: Record<string, CustomComponentDefinition>;
}

// ============================================
// Form Data Types
// ============================================

export type FormData = Record<string, unknown>;

// ============================================
// Schema Types
// ============================================

export type GeneratedSchema = ZodObject<any>;

// ============================================
// Field Component Props (react-hook-form integration)
// ============================================

export interface BaseFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  field: ControllerRenderProps<TFieldValues, TName>;
  fieldState: ControllerFieldState;
  config: FieldElement;
}

export interface TextFieldProps extends BaseFieldProps {
  config: TextFieldElement;
}

export interface EmailFieldProps extends BaseFieldProps {
  config: EmailFieldElement;
}

export interface BooleanFieldProps extends BaseFieldProps {
  config: BooleanFieldElement;
}

export interface PhoneFieldProps extends BaseFieldProps {
  config: PhoneFieldElement;
}

export interface DateFieldProps extends BaseFieldProps {
  config: DateFieldElement;
}

export interface CustomFieldProps extends BaseFieldProps {
  config: CustomFieldElement;
}

export interface SelectFieldProps extends BaseFieldProps {
  config: SelectFieldElement;
}

export interface ArrayFieldProps extends BaseFieldProps {
  config: ArrayFieldElement;
}

// ============================================
// Component Types
// ============================================

export type TextFieldComponent = React.ComponentType<TextFieldProps>;
export type EmailFieldComponent = React.ComponentType<EmailFieldProps>;
export type BooleanFieldComponent = React.ComponentType<BooleanFieldProps>;
export type PhoneFieldComponent = React.ComponentType<PhoneFieldProps>;
export type DateFieldComponent = React.ComponentType<DateFieldProps>;
export type SelectFieldComponent = React.ComponentType<SelectFieldProps>;
export type ArrayFieldComponent = React.ComponentType<ArrayFieldProps>;
export type CustomFieldComponent = React.ComponentType<CustomFieldProps>;

export interface FieldComponentRegistry {
  text: TextFieldComponent;
  email: EmailFieldComponent;
  boolean: BooleanFieldComponent;
  phone: PhoneFieldComponent;
  date: DateFieldComponent;
  select?: SelectFieldComponent;
  array?: ArrayFieldComponent;
}

export type CustomComponentRegistry = Record<string, CustomFieldComponent>;

// ============================================
// Container Props
// ============================================

export interface ContainerProps {
  config: ContainerElement;
  children: React.ReactNode;
}

export interface ColumnProps {
  config: ColumnElement;
  children: React.ReactNode;
}

export type CustomContainerRegistry = Record<string, React.ComponentType<ContainerProps>>;

// ============================================
// Event Handler Types
// ============================================

export type OnSubmitHandler = (data: FormData) => void | Promise<void>;
export type OnChangeHandler = (data: FormData, changedField: string) => void;
export type OnValidationChangeHandler = (errors: FieldErrors, isValid: boolean) => void;
export type OnResetHandler = () => void;
export type OnErrorHandler = (errors: FieldErrors) => void;

// ============================================
// DynamicForm Props
// ============================================

export interface DynamicFormProps {
  /** Form configuration */
  config: FormConfiguration;

  /** Initial form data */
  initialData?: FormData;

  /** Required: Field component implementations */
  fieldComponents: FieldComponentRegistry;

  /** Optional: Custom field components */
  customComponents?: CustomComponentRegistry;

  /** Optional: Custom container components */
  customContainers?: CustomContainerRegistry;

  /** Called on successful form submission */
  onSubmit: OnSubmitHandler;

  /** Called when form values change */
  onChange?: OnChangeHandler;

  /** Called when validation state changes */
  onValidationChange?: OnValidationChangeHandler;

  /** Called when form is reset */
  onReset?: OnResetHandler;

  /** Called on submission errors */
  onError?: OnErrorHandler;

  /**
   * Optional: Custom react-hook-form resolver for validation.
   * Use this to provide validation with any library (Zod, Yup, Joi, custom).
   * Takes priority over `schema` prop and config-driven validation.
   * If not provided and no schema prop, uses config-driven validation.
   */
  resolver?: Resolver<FormData>;

  /**
   * Optional: External Zod schema for validation.
   * Internally wrapped with visibility-aware resolver.
   * Ignored if `resolver` prop is provided.
   * Takes priority over config-driven validation.
   */
  schema?: ZodSchema;

  /** Validation mode */
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';

  /**
   * Controls validation behavior for invisible fields.
   * Only applies when using `schema` prop or config-driven validation.
   * - 'skip': Do not validate invisible fields (default)
   * - 'validate': Validate all fields regardless of visibility
   * - 'warn': Validate but treat errors as warnings (non-blocking)
   */
  invisibleFieldValidation?: InvisibleFieldValidation;

  /** Form HTML attributes */
  className?: string;
  style?: React.CSSProperties;
  id?: string;

  /** Content to render after all form fields (e.g., submit button) */
  children?: React.ReactNode;

  /**
   * Optional wrapper function for each field.
   * Use for adding indicators, badges, edit tracking, etc.
   */
  fieldWrapper?: FieldWrapperFunction;
}

// ============================================
// Context Types
// ============================================

export interface DynamicFormContextValue {
  config: FormConfiguration;
  visibility: Record<string, boolean>;
  fieldComponents: FieldComponentRegistry;
  customComponents: CustomComponentRegistry;
}

// ============================================
// Resolver Types
// ============================================

export type VisibilityAwareResolver = Resolver<any>;
```

---

## 15. Testing Strategy

### 15.1 Unit Tests

#### Configuration Parser Tests

```typescript
describe('ConfigurationParser', () => {
  it('should parse valid configuration', () => {
    const config = {
      elements: [
        { type: 'text', name: 'source.name', label: 'Name' }
      ]
    };
    
    const result = parseConfiguration(config);
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0].type).toBe('text');
  });

  it('should reject invalid element type', () => {
    const config = {
      elements: [{ type: 'invalid', name: 'field1' }]
    };
    expect(() => parseConfiguration(config)).toThrow();
  });

  it('should require columns for container type', () => {
    const config = {
      elements: [{ type: 'container' }]
    };
    expect(() => parseConfiguration(config)).toThrow();
  });
});
```

#### Zod Schema Generation Tests

```typescript
describe('Zod Schema Generation', () => {
  it('should generate schema for simple fields', () => {
    const config: FormConfiguration = {
      elements: [
        { type: 'text', name: 'name', validation: { required: true } },
        { type: 'email', name: 'email' },
      ]
    };
    
    const schema = generateZodSchema(config);
    
    // Valid data
    expect(() => schema.parse({ name: 'John', email: 'john@example.com' })).not.toThrow();
    
    // Invalid - missing required field
    expect(() => schema.parse({ name: '', email: 'john@example.com' })).toThrow();
  });

  it('should generate nested schema for dot notation paths', () => {
    const config: FormConfiguration = {
      elements: [
        { type: 'text', name: 'source.name', validation: { required: true } },
        { type: 'email', name: 'source.email' },
      ]
    };
    
    const schema = generateZodSchema(config);
    
    const validData = {
      source: {
        name: 'John',
        email: 'john@example.com'
      }
    };
    
    expect(() => schema.parse(validData)).not.toThrow();
  });

  it('should apply minLength and maxLength validators', () => {
    const config: FormConfiguration = {
      elements: [
        { 
          type: 'text', 
          name: 'name', 
          validation: { minLength: 3, maxLength: 10 } 
        },
      ]
    };
    
    const schema = generateZodSchema(config);
    
    expect(() => schema.parse({ name: 'Jo' })).toThrow(); // Too short
    expect(() => schema.parse({ name: 'John' })).not.toThrow(); // Valid
    expect(() => schema.parse({ name: 'JohnJohnJohn' })).toThrow(); // Too long
  });
});
```

#### JSON Logic Validation Tests

```typescript
describe('JSON Logic Validation with Zod', () => {
  it('should evaluate regex_match with string path', () => {
    const config: FormConfiguration = {
      elements: [
        { type: 'boolean', name: 'source.has_phone' },
        { 
          type: 'phone', 
          name: 'source.phone',
          validation: {
            condition: {
              "or": [
                { "and": [
                  { "var": "source.has_phone" },
                  { "regex_match": ["^[0-9]{10}$", "source.phone"] }
                ]},
                { "!": { "var": "source.has_phone" } }
              ]
            },
            message: 'Invalid phone number'
          }
        },
      ]
    };
    
    const schema = generateZodSchemaWithConditions(config);
    
    // has_phone is false, so validation passes
    expect(() => schema.parse({ 
      source: { has_phone: false, phone: '' } 
    })).not.toThrow();
    
    // has_phone is true, phone is valid
    expect(() => schema.parse({ 
      source: { has_phone: true, phone: '1234567890' } 
    })).not.toThrow();
    
    // has_phone is true, phone is invalid
    expect(() => schema.parse({ 
      source: { has_phone: true, phone: '123' } 
    })).toThrow();
  });
});
```

#### Visibility Tests

```typescript
describe('Visibility Calculator', () => {
  it('should calculate field visibility', () => {
    const config: FormConfiguration = {
      elements: [
        { type: 'boolean', name: 'source.has_phone', label: 'Has Phone' },
        { 
          type: 'phone', 
          name: 'source.phone', 
          visible: { "var": "source.has_phone" } 
        }
      ]
    };
    
    const visibility = calculateVisibility(config, { source: { has_phone: false } });
    expect(visibility['source.has_phone']).toBe(true);
    expect(visibility['source.phone']).toBe(false);
  });

  it('should inherit visibility from container', () => {
    const config: FormConfiguration = {
      elements: [
        {
          type: 'container',
          visible: { "var": "showDetails" },
          columns: [
            {
              type: 'column',
              width: '100%',
              elements: [
                { type: 'text', name: 'details.field1' }
              ]
            }
          ]
        }
      ]
    };
    
    const visibility = calculateVisibility(config, { showDetails: false });
    expect(visibility['details.field1']).toBe(false);
  });
});
```

#### Visibility-Aware Resolver Tests

```typescript
describe('Visibility-Aware Resolver', () => {
  it('should skip errors for invisible fields when mode is skip', async () => {
    const schema = z.object({
      name: z.string().min(1, 'Required'),
      phone: z.string().min(10, 'Must be 10 digits'),
    });
    
    const visibility = { name: true, phone: false };
    const resolver = createVisibilityAwareResolver(schema, { 
      visibility, 
      mode: 'skip' 
    });
    
    const result = await resolver({ name: '', phone: '123' }, {}, {});
    
    // Should only have error for visible 'name' field
    expect(result.errors).toHaveProperty('name');
    expect(result.errors).not.toHaveProperty('phone');
  });

  it('should include errors for invisible fields when mode is validate', async () => {
    const schema = z.object({
      name: z.string().min(1, 'Required'),
      phone: z.string().min(10, 'Must be 10 digits'),
    });
    
    const visibility = { name: true, phone: false };
    const resolver = createVisibilityAwareResolver(schema, { 
      visibility, 
      validateInvisibleFields: true,
      mode: 'validate' 
    });
    
    const result = await resolver({ name: '', phone: '123' }, {}, {});
    
    // Should have errors for both fields
    expect(result.errors).toHaveProperty('name');
    expect(result.errors).toHaveProperty('phone');
  });
});
```

### 15.2 Integration Tests

```typescript
describe('DynamicForm Integration', () => {
  const fieldComponents: FieldComponentRegistry = {
    text: MockTextInput,
    email: MockEmailInput,
    boolean: MockCheckbox,
    phone: MockPhoneInput,
    date: MockDateInput,
  };

  it('should render form from configuration', () => {
    const config: FormConfiguration = {
      elements: [
        { type: 'text', name: 'source.name', label: 'Name' }
      ]
    };
    
    render(
      <DynamicForm
        config={config}
        fieldComponents={fieldComponents}
        onSubmit={jest.fn()}
      />
    );
    
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('should handle nested field paths', async () => {
    const onSubmit = jest.fn();
    const config: FormConfiguration = {
      elements: [
        { type: 'text', name: 'source.name', label: 'Name' }
      ]
    };
    
    render(
      <DynamicForm
        config={config}
        fieldComponents={fieldComponents}
        onSubmit={onSubmit}
      />
    );
    
    fireEvent.change(screen.getByLabelText('Name'), { 
      target: { value: 'John' } 
    });
    fireEvent.submit(screen.getByRole('form'));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        source: { name: 'John' }
      });
    });
  });

  it('should validate using generated Zod schema', async () => {
    const onSubmit = jest.fn();
    const config: FormConfiguration = {
      elements: [
        { 
          type: 'text', 
          name: 'name', 
          label: 'Name',
          validation: { required: true, minLength: 3 }
        }
      ]
    };
    
    render(
      <DynamicForm
        config={config}
        fieldComponents={fieldComponents}
        onSubmit={onSubmit}
      />
    );
    
    // Submit with invalid value
    fireEvent.change(screen.getByLabelText('Name'), { 
      target: { value: 'Jo' } 
    });
    fireEvent.submit(screen.getByRole('form'));
    
    await waitFor(() => {
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    });
    
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should respect invisibleFieldValidation prop', async () => {
    const onSubmit = jest.fn();
    const config: FormConfiguration = {
      elements: [
        { type: 'boolean', name: 'showPhone', label: 'Show Phone' },
        { 
          type: 'phone', 
          name: 'phone', 
          label: 'Phone',
          visible: { "var": "showPhone" },
          validation: { required: true }
        }
      ]
    };
    
    render(
      <DynamicForm
        config={config}
        fieldComponents={fieldComponents}
        onSubmit={onSubmit}
        invisibleFieldValidation="skip"
      />
    );
    
    // Phone is hidden (showPhone is false), so validation should pass
    fireEvent.submit(screen.getByRole('form'));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
```

---

## 16. Usage Examples

### 16.1 Sample Form Configuration (from specification)

```json
{
  "name": "Sample form",
  "elements": [
    {
      "type": "container",
      "columns": [
        {
          "type": "column",
          "width": "50%",
          "elements": [
            {
              "type": "text",
              "name": "source.name",
              "label": "Name",
              "validation": {
                "required": true,
                "minLength": 3,
                "maxLength": 100
              }
            },
            {
              "type": "boolean",
              "name": "source.has_phone",
              "label": "Has Phone Number"
            }
          ]
        },
        {
          "type": "column",
          "width": "50%",
          "elements": [
            {
              "type": "email",
              "name": "source.email",
              "label": "Email Address",
              "validation": {
                "required": true
              }
            },
            {
              "type": "phone",
              "name": "source.phone",
              "label": "Phone Number",
              "visible": {
                "var": "source.has_phone"
              },
              "validation": {
                "condition": {
                  "or": [
                    {
                      "and": [
                        { "var": "source.has_phone" },
                        { "regex_match": ["^[0-9]{10}$", "source.phone"] }
                      ]
                    },
                    { "!": { "var": "source.has_phone" } }
                  ]
                },
                "message": "Please enter a valid 10-digit phone number"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

### 16.2 React Implementation Example

```tsx
import { 
  DynamicForm, 
  FieldComponentRegistry,
  TextFieldComponent,
  EmailFieldComponent,
  BooleanFieldComponent,
  PhoneFieldComponent,
  DateFieldComponent,
  FormData
} from '@company/dynamic-form';

// Implement field components
const TextInput: TextFieldComponent = ({ field, fieldState, config }) => (
  <div className="form-field">
    <label htmlFor={field.name}>{config.label}</label>
    <input
      id={field.name}
      type="text"
      placeholder={config.placeholder}
      {...field}
    />
    {fieldState.error && (
      <span className="error">{fieldState.error.message}</span>
    )}
  </div>
);

const EmailInput: EmailFieldComponent = ({ field, fieldState, config }) => (
  <div className="form-field">
    <label htmlFor={field.name}>{config.label}</label>
    <input
      id={field.name}
      type="email"
      placeholder={config.placeholder}
      {...field}
    />
    {fieldState.error && (
      <span className="error">{fieldState.error.message}</span>
    )}
  </div>
);

const Checkbox: BooleanFieldComponent = ({ field, fieldState, config }) => (
  <div className="form-field">
    <label>
      <input
        type="checkbox"
        checked={field.value as boolean}
        onChange={(e) => field.onChange(e.target.checked)}
        onBlur={field.onBlur}
        name={field.name}
        ref={field.ref}
      />
      {config.label}
    </label>
  </div>
);

const PhoneInput: PhoneFieldComponent = ({ field, fieldState, config }) => (
  <div className="form-field">
    <label htmlFor={field.name}>{config.label}</label>
    <input
      id={field.name}
      type="tel"
      inputMode="numeric"
      placeholder={config.placeholder}
      {...field}
    />
    {fieldState.error && (
      <span className="error">{fieldState.error.message}</span>
    )}
  </div>
);

const DateInput: DateFieldComponent = ({ field, fieldState, config }) => (
  <div className="form-field">
    <label htmlFor={field.name}>{config.label}</label>
    <input
      id={field.name}
      type="date"
      {...field}
    />
    {fieldState.error && (
      <span className="error">{fieldState.error.message}</span>
    )}
  </div>
);

// Register all field components
const fieldComponents: FieldComponentRegistry = {
  text: TextInput,
  email: EmailInput,
  boolean: Checkbox,
  phone: PhoneInput,
  date: DateInput,
};

// Use DynamicForm
function App() {
  const handleSubmit = (data: FormData) => {
    console.log('Form submitted:', data);
    // data will be:
    // {
    //   source: {
    //     name: "John Doe",
    //     email: "john@example.com",
    //     has_phone: true,
    //     phone: "1234567890"
    //   }
    // }
  };

  return (
    <DynamicForm
      config={sampleFormConfig}
      fieldComponents={fieldComponents}
      onSubmit={handleSubmit}
      onChange={(data, field) => console.log(`${field} changed:`, data)}
      invisibleFieldValidation="skip" // Don't validate hidden fields
    />
  );
}
```

### 16.3 Usage with invisibleFieldValidation Options

```tsx
// Example 1: Skip validation for invisible fields (default)
<DynamicForm
  config={config}
  fieldComponents={fieldComponents}
  onSubmit={handleSubmit}
  invisibleFieldValidation="skip"
/>

// Example 2: Validate all fields including invisible ones
<DynamicForm
  config={config}
  fieldComponents={fieldComponents}
  onSubmit={handleSubmit}
  invisibleFieldValidation="validate"
/>

// Example 3: Warn about invalid invisible fields but don't block submission
<DynamicForm
  config={config}
  fieldComponents={fieldComponents}
  onSubmit={handleSubmit}
  invisibleFieldValidation="warn"
/>
```

---

## Appendix A: JSON Logic Operations Reference

### Standard Operations

| Operation | Syntax | Description |
|-----------|--------|-------------|
| `var` | `{"var": "path.to.field"}` | Get field value by path |
| `==` | `{"==": [a, b]}` | Equality |
| `!=` | `{"!=": [a, b]}` | Inequality |
| `!` | `{"!": a}` | Negation |
| `!!` | `{"!!": [a]}` | Double negation (truthy check) |
| `and` | `{"and": [a, b, ...]}` | Logical AND |
| `or` | `{"or": [a, b, ...]}` | Logical OR |

### Custom Operations

| Operation | Syntax | Description |
|-----------|--------|-------------|
| `regex_match` | `{"regex_match": ["pattern", "field.path"]}` | Regex test (note: uses string path, not var) |

---

## Appendix B: User Stories Reference

From the specification:

| Key | Summary | Status |
|-----|---------|--------|
| BLUE12599 | Implement conditional visibility | Requirements |
| BLUE12598 | Implement dependent validation | Requirements |
| BLUE12597 | Define common validation rules | Requirements |
| BLUE12596 | Define default values for fields | Requirements |
| BLUE12589 | Trigger event on form submission | Requirements |
| BLUE12588 | Integrate custom React components | Requirements |
| BLUE12586 | Prepare built-in elements for basic types | Requirements |
| BLUE12585 | Define form using JSON configuration | Backlog |
| BLUE12584 | Conditional display of fields/sections | Requirements |
| BLUE12583 | Show validation messages | Requirements |
| BLUE12582 | Display fields in specified layout | Requirements |
| BLUE12581 | Display fields according to configuration | Requirements |

---

*This documentation aligns with the Dynamic Form project specification and provides comprehensive guidance for implementation using react-hook-form with Zod schema validation as the foundation.*
