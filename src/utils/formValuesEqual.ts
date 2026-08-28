const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Compares form values while treating an absent object property and an
 * explicitly registered `undefined` property as equivalent. React Hook Form
 * adds the latter to `_formValues` when a configured field is missing from
 * `defaultValues`; that registration detail must not make the form dirty.
 */
export const formValuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!(Array.isArray(left) && Array.isArray(right))) {
      return false;
    }
    if (left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => formValuesEqual(value, right[index]));
  }

  if (!(isPlainObject(left) && isPlainObject(right))) {
    return false;
  }

  const leftKeys = Object.keys(left).filter((key) => left[key] !== undefined);
  const rightKeys = Object.keys(right).filter(
    (key) => right[key] !== undefined
  );
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) => Object.hasOwn(right, key) && formValuesEqual(left[key], right[key])
  );
};
