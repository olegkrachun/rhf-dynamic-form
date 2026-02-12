/**
 * JSON Logic rule type - a generic record for JSON Logic expressions.
 * Used for visibility and validation conditions.
 */
export type JsonLogicRule = Record<string, unknown>;

/**
 * Validation configuration for form fields.
 * Phase 1 supports: required, minLength, maxLength, pattern
 * Phase 3 will add: condition (JSON Logic)
 */
export interface ValidationConfig {
  /** Field is required - must have a non-empty value */
  required?: boolean;

  /** Type-specific validation hint (any string — engine does not enforce a closed set) */
  type?: string;

  /** Minimum length for text fields */
  minLength?: number;

  /** Maximum length for text fields */
  maxLength?: number;

  /** Regular expression pattern for validation */
  pattern?: string;

  /** Custom error message for pattern/condition failure */
  message?: string;

  /** JSON Logic condition for complex validation (Phase 3) */
  condition?: JsonLogicRule;
}

/**
 * Controls validation behavior for invisible fields.
 * - 'skip': Do not validate invisible fields (default)
 * - 'validate': Validate all fields regardless of visibility
 * - 'warn': Validate but treat errors as warnings (non-blocking)
 */
export type InvisibleFieldValidation = "skip" | "validate" | "warn";
