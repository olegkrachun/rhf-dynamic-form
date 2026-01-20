import type { FormConfiguration } from "../types";
import {
  safeValidateConfiguration,
  validateConfiguration,
} from "./configValidator";

/**
 * Error thrown when configuration parsing fails.
 */
export class ConfigurationError extends Error {
  /** The original validation errors */
  readonly errors: unknown[];

  constructor(message: string, errors: unknown[]) {
    super(message);
    this.name = "ConfigurationError";
    this.errors = errors;
  }
}

/**
 * Result of parsing a configuration.
 */
export interface ParseResult {
  success: boolean;
  config?: FormConfiguration;
  errors?: string[];
}

/**
 * Parses and validates a form configuration.
 *
 * @param config - Raw configuration object (typically from JSON)
 * @returns Validated FormConfiguration
 * @throws ConfigurationError if validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const config = parseConfiguration({
 *     elements: [
 *       { type: 'text', name: 'name', label: 'Name' }
 *     ]
 *   });
 *   // config is now typed as FormConfiguration
 * } catch (error) {
 *   if (error instanceof ConfigurationError) {
 *     console.error('Invalid configuration:', error.errors);
 *   }
 * }
 * ```
 */
export const parseConfiguration = (config: unknown): FormConfiguration => {
  try {
    const validated = validateConfiguration(config);
    return validated as FormConfiguration;
  } catch (error) {
    // Zod v4 uses 'issues' property for validation errors
    if (error && typeof error === "object" && "issues" in error) {
      const zodError = error as { issues: unknown[] };
      throw new ConfigurationError(
        "Invalid form configuration",
        zodError.issues
      );
    }
    throw error;
  }
};

/**
 * Safely parses and validates a form configuration without throwing.
 *
 * @param config - Raw configuration object
 * @returns ParseResult with success status and config or errors
 *
 * @example
 * ```typescript
 * const result = safeParseConfiguration(rawConfig);
 * if (result.success) {
 *   // result.config is available
 *   renderForm(result.config);
 * } else {
 *   // result.errors contains validation messages
 *   showErrors(result.errors);
 * }
 * ```
 */
export const safeParseConfiguration = (config: unknown): ParseResult => {
  const result = safeValidateConfiguration(config);

  if (result.success) {
    return {
      success: true,
      config: result.data as FormConfiguration,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
};
