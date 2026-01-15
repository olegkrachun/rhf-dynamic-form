# Dynamic Forms Library

Configuration-driven form generation library for React with react-hook-form and Zod integration.

## Project Overview

This library enables rapid deployment of data collection forms by defining form structures, validations, and display logic through declarative JSON configurations.

**Key Features:**
- Configuration-driven form generation from JSON
- react-hook-form integration with Zod resolver
- Type-safe validation with dynamic Zod schema generation
- Nested field paths (dot notation: `contact.firstName`)
- Custom field and container component support
- Extensible architecture

## Tech Stack

- **React 19** - UI framework
- **react-hook-form** - Form state management
- **Zod v4** - Schema validation
- **TypeScript** - Type safety
- **Vitest** - Testing
- **tsdown** - Library bundling (ESM + CJS)
- **Vite** - Dev server
- **Ultracite/Biome** - Linting and formatting

## Project Structure

```
src/
├── components/          # React components
│   ├── DynamicForm.tsx  # Main form component
│   ├── FormRenderer.tsx # Renders form elements
│   ├── ElementRenderer.tsx # Routes to field/container renderers
│   └── FieldRenderer.tsx   # Renders individual fields
├── context/             # React context for form state
├── hooks/               # Custom hooks (useDynamicFormContext)
├── parser/              # Configuration parsing and validation
├── schema/              # Zod schema generation
├── types/               # TypeScript type definitions
│   ├── elements.ts      # Field and layout element types
│   ├── fields.ts        # Field component props and registries
│   ├── config.ts        # Form configuration types
│   └── events.ts        # Event handler types
└── utils/               # Utilities (flattenFields, mergeDefaults)

sample/                  # Sample application
├── App.tsx              # Demo form with all field types
├── fields/              # Sample field implementations
└── styles.css           # Demo styling
```

## Development Commands

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Build library with tsdown
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm typecheck    # TypeScript type checking
pnpm lint         # Check for lint errors
pnpm lint:fix     # Auto-fix lint errors
```

## Key Types

- `FormConfiguration` - Top-level form config with elements array
- `FieldElement` - Union of all field types (text, email, boolean, phone, date, custom)
- `ContainerElement` - Layout container with columns
- `ColumnElement` - Column with width and nested elements
- `FieldComponentRegistry` - Maps field types to components
- `CustomComponentRegistry` - Maps custom component names to implementations

## Implementation Phases

- **Phase 1** ✅ - Core form rendering, field types, validation, nested paths
- **Phase 2** ✅ - Container/column layout system, custom containers
- **Phase 3** ✅ - Declarative validation with JSON Logic, visibility-aware resolver
- **Phase 4** - Visibility control system
- **Phase 5** - Advanced features (arrays, dependencies)

## Testing

Tests are colocated with implementation files:
- `src/parser/configParser.test.ts`
- `src/schema/generateSchema.test.ts`
- `src/schema/nestedPaths.test.ts`
- `src/schema/jsonLogicValidation.test.ts`
- `src/components/ContainerRenderer.test.tsx`
- `src/components/ColumnRenderer.test.tsx`
- `src/validation/jsonLogic.test.ts`
- `src/resolver/visibilityAwareResolver.test.ts`

Run with: `pnpm test`

---

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Prefer safe React patterns over raw HTML injection
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `pnpm dlx ultracite fix` before committing to ensure compliance.
