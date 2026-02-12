import { useFormContext } from "react-hook-form";
import type {
  ArrayFieldElement,
  BaseFieldComponent,
  FieldElement,
  SelectFieldElement,
} from "../../src";

/**
 * Get nested error from form errors object.
 */
const getNestedError = (
  errors: Record<string, unknown>,
  path: string
): string | undefined => {
  const parts = path.split(".");
  let current: unknown = errors;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (current && typeof current === "object" && "message" in current) {
    return (current as { message: string }).message;
  }

  return undefined;
};

/**
 * Render a single field within an array item.
 * @param itemField - Field configuration
 * @param itemIndex - Index of the array item (for unique IDs)
 * @param value - Current item value
 * @param onChange - Handler for value changes
 * @param error - Validation error message if any
 */
const renderItemField = (
  itemField: FieldElement,
  itemIndex: number,
  value: unknown,
  onChange: (fieldName: string, newValue: unknown) => void,
  error?: string
) => {
  const fieldValue = value as Record<string, unknown>;
  const currentValue = fieldValue?.[itemField.name] ?? "";
  const hasError = Boolean(error);
  // Create unique ID using item index and field name
  const fieldId = `${itemField.name}-${itemIndex}`;

  switch (itemField.type) {
    case "text":
    case "email":
    case "phone":
      return (
        <div className="array-item-field" key={fieldId}>
          <label className="field-label" htmlFor={fieldId}>
            {itemField.label}
            {itemField.validation?.required && (
              <span className="required">*</span>
            )}
          </label>
          <input
            className={`field-input ${hasError ? "field-input--error" : ""}`}
            id={fieldId}
            onChange={(e) => onChange(itemField.name, e.target.value)}
            placeholder={itemField.placeholder}
            type={itemField.type === "email" ? "email" : "text"}
            value={(currentValue as string) ?? ""}
          />
          {error && <span className="field-error">{error}</span>}
        </div>
      );

    case "select":
      return (
        <div className="array-item-field" key={fieldId}>
          <label className="field-label" htmlFor={fieldId}>
            {itemField.label}
            {itemField.validation?.required && (
              <span className="required">*</span>
            )}
          </label>
          <select
            className={`field-input ${hasError ? "field-input--error" : ""}`}
            id={fieldId}
            onChange={(e) => onChange(itemField.name, e.target.value)}
            value={(currentValue as string) ?? ""}
          >
            <option value="">Select...</option>
            {((itemField as SelectFieldElement).options ?? []).map((opt) => (
              <option disabled={opt.disabled} key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <span className="field-error">{error}</span>}
        </div>
      );

    case "boolean":
      return (
        <div
          className="array-item-field array-item-field--checkbox"
          key={fieldId}
        >
          <label className="field-label--checkbox" htmlFor={fieldId}>
            <input
              checked={Boolean(currentValue)}
              className="field-checkbox"
              id={fieldId}
              onChange={(e) => onChange(itemField.name, e.target.checked)}
              type="checkbox"
            />
            {itemField.label}
          </label>
        </div>
      );

    default:
      return null;
  }
};

/**
 * Sample array field component.
 * Renders actual form fields for each array item with validation errors.
 */
export const ArrayField: BaseFieldComponent = ({
  field,
  fieldState,
  config: baseConfig,
}) => {
  const config = baseConfig as ArrayFieldElement;
  const { formState } = useFormContext();
  const items = Array.isArray(field.value) ? field.value : [];

  const updateItem = (index: number, fieldName: string, newValue: unknown) => {
    const newItems = [...items];
    newItems[index] = {
      ...(newItems[index] as Record<string, unknown>),
      [fieldName]: newValue,
    };
    field.onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    field.onChange(newItems);
  };

  const addItem = () => {
    const newItem: Record<string, unknown> = {};
    for (const itemField of config.itemFields) {
      newItem[itemField.name] = itemField.defaultValue ?? "";
    }
    field.onChange([...items, newItem]);
  };

  // Get errors for this array field
  const getItemFieldError = (
    index: number,
    fieldName: string
  ): string | undefined => {
    const errorPath = `${field.name}.${index}.${fieldName}`;
    return getNestedError(
      formState.errors as Record<string, unknown>,
      errorPath
    );
  };

  return (
    <div className="field-wrapper">
      {config.label && (
        <span className="field-label">
          {config.label}
          {config.validation?.required && <span className="required">*</span>}
        </span>
      )}
      <div className="array-field">
        {items.map((item, index) => (
          <div className="array-field-item" key={`${field.name}-${index}`}>
            <div className="array-field-item-header">
              <span>Item {index + 1}</span>
              <button
                className="array-field-remove"
                disabled={
                  config.minItems !== undefined &&
                  items.length <= config.minItems
                }
                onClick={() => removeItem(index)}
                type="button"
              >
                Remove
              </button>
            </div>
            <div className="array-field-item-fields">
              {config.itemFields.map((itemField) =>
                renderItemField(
                  itemField,
                  index,
                  item,
                  (fieldName, newValue) =>
                    updateItem(index, fieldName, newValue),
                  getItemFieldError(index, itemField.name)
                )
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="array-field-empty">No items added yet.</p>
        )}
        <button
          className="array-field-add"
          disabled={
            config.maxItems !== undefined && items.length >= config.maxItems
          }
          onClick={addItem}
          type="button"
        >
          {config.addButtonLabel ?? "Add Item"}
        </button>
      </div>
      {fieldState.error && (
        <span className="field-error" role="alert">
          {fieldState.error.message}
        </span>
      )}
    </div>
  );
};

ArrayField.displayName = "ArrayField";
