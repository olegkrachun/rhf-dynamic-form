import type { FieldElement, FormElement } from "../types";
import {
  isArrayFieldElement,
  isContainerElement,
  isFieldElement,
} from "../types";
import { collectVars } from "../utils";

const ITEM_SCOPE_PREFIX = "$item.";
const ROW_PATH_PATTERN = /^(.+)\.(\d+)\.(.+)$/;

/**
 * Reverse index of `validation.condition` references: for a changed field it
 * answers "which fields' conditions read this value and must re-validate".
 *
 * This inverts the direction `rules.deps` used to encode (owner -> inputs),
 * which never re-validated an owner when its *input* changed. It also lets the
 * engine trigger each dependent by name: single-name `trigger(name)` emits a
 * NAMED react-hook-form notification, so only that field's subscribers
 * re-render — an array `trigger([...])` broadcasts with no name and wakes
 * every controller in the form (the measured whole-tree keystroke render).
 */
export interface ReverseValidationDeps {
  /** root var path -> top-level field names whose conditions read it */
  rootToOwners: Record<string, string[]>;
  /** root var path -> owners inside arrays (applies to every row) */
  rootToArrayOwners: Record<string, { arrayName: string; ownerRel: string }[]>;
  /** array name -> row-relative dep path -> row-relative owner names */
  arrayRelDeps: Record<string, Record<string, string[]>>;
}

const addTo = (map: Record<string, string[]>, key: string, value: string) => {
  let list = map[key];
  if (!list) {
    list = [];
    map[key] = list;
  }
  if (!list.includes(value)) {
    list.push(value);
  }
};

const addArrayOwner = (
  deps: ReverseValidationDeps,
  varPath: string,
  arrayName: string,
  ownerRel: string
) => {
  let owners = deps.rootToArrayOwners[varPath];
  if (!owners) {
    owners = [];
    deps.rootToArrayOwners[varPath] = owners;
  }
  const exists = owners.some(
    (owner) => owner.arrayName === arrayName && owner.ownerRel === ownerRel
  );
  if (!exists) {
    owners.push({ arrayName, ownerRel });
  }
};

const collectArrayFieldDeps = (
  deps: ReverseValidationDeps,
  arrayName: string,
  itemField: FieldElement
) => {
  const condition = itemField.validation?.condition;
  if (!condition) {
    return;
  }
  for (const varPath of collectVars(condition)) {
    if (varPath.startsWith(ITEM_SCOPE_PREFIX)) {
      const rel = varPath.slice(ITEM_SCOPE_PREFIX.length);
      if (rel === itemField.name) {
        continue;
      }
      let relMap = deps.arrayRelDeps[arrayName];
      if (!relMap) {
        relMap = {};
        deps.arrayRelDeps[arrayName] = relMap;
      }
      addTo(relMap, rel, itemField.name);
      continue;
    }
    if (!varPath.startsWith("$")) {
      addArrayOwner(deps, varPath, arrayName, itemField.name);
    }
  }
};

export const buildReverseValidationDeps = (
  elements: FormElement[]
): ReverseValidationDeps => {
  const deps: ReverseValidationDeps = {
    rootToOwners: {},
    rootToArrayOwners: {},
    arrayRelDeps: {},
  };

  const visitField = (field: FieldElement) => {
    const condition = field.validation?.condition;
    if (!condition) {
      return;
    }
    for (const varPath of collectVars(condition)) {
      if (varPath !== field.name && !varPath.startsWith("$")) {
        addTo(deps.rootToOwners, varPath, field.name);
      }
    }
  };

  const visitArray = (arrayName: string, itemFields: FieldElement[]) => {
    for (const itemField of itemFields) {
      collectArrayFieldDeps(deps, arrayName, itemField);
    }
  };

  const visit = (element: FormElement) => {
    if (isArrayFieldElement(element)) {
      visitField(element as FieldElement);
      visitArray(element.name, element.itemFields ?? []);
      return;
    }
    if (isFieldElement(element)) {
      visitField(element);
      return;
    }
    if (isContainerElement(element)) {
      for (const child of element.children ?? []) {
        visit(child);
      }
    }
  };

  for (const element of elements) {
    visit(element);
  }
  return deps;
};

/**
 * Resolve the concrete field paths to re-validate after `changedName` changed.
 * Row-scoped deps resolve against the changed row; root-referenced row owners
 * expand across the array's current rows.
 */
export const getValidationDependents = (
  deps: ReverseValidationDeps,
  changedName: string,
  getValues: (name: string) => unknown
): string[] => {
  const out = new Set<string>();

  for (const owner of deps.rootToOwners[changedName] ?? []) {
    out.add(owner);
  }

  for (const { arrayName, ownerRel } of deps.rootToArrayOwners[changedName] ??
    []) {
    const rows = getValues(arrayName);
    if (Array.isArray(rows)) {
      for (let index = 0; index < rows.length; index += 1) {
        out.add(`${arrayName}.${index}.${ownerRel}`);
      }
    }
  }

  const rowMatch = ROW_PATH_PATTERN.exec(changedName);
  if (rowMatch) {
    const [, arrayName, rowIndex, rel] = rowMatch;
    for (const ownerRel of deps.arrayRelDeps[arrayName]?.[rel] ?? []) {
      out.add(`${arrayName}.${rowIndex}.${ownerRel}`);
    }
  }

  out.delete(changedName);
  return [...out];
};

/**
 * Applies the outcome of ONE resolver pass to the dependents of a changed
 * field, addressing each by name.
 *
 * Not `form.trigger([...dependents])`: RHF's array trigger emits a
 * notification with no field name, and every controller in the form
 * re-renders — measured at 299 of 300 array cells per keystroke. `setError` /
 * `clearErrors` carry the name, so only that field's subscribers wake.
 *
 * Passes are generation-stamped by the caller: while one awaits the resolver
 * the user can type again, and only the newest pass may write, so a slow
 * earlier pass can never land the verdict for a replaced value.
 */
export const applyDependentErrors = (
  dependents: string[],
  resolvedErrors: Record<string, unknown>,
  form: {
    getFieldState: (name: string) => { error?: { message?: string } };
    setError: (name: string, error: { type: string; message: string }) => void;
    clearErrors: (name: string) => void;
  },
  getNested: (source: Record<string, unknown>, path: string) => unknown
): void => {
  for (const dependent of dependents) {
    const nextError = getNested(resolvedErrors, dependent) as
      | { type?: string; message?: string }
      | undefined;
    const currentError = form.getFieldState(dependent).error;

    if (!nextError?.message) {
      if (currentError) {
        form.clearErrors(dependent);
      }
      continue;
    }
    if (currentError?.message !== nextError.message) {
      form.setError(dependent, {
        type: nextError.type ?? "validate",
        message: nextError.message,
      });
    }
  }
};
