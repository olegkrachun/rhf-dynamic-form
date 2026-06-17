import { useEffect, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { useDynamicFormContext } from "../hooks";
import type { SelectFieldElement, SelectOption } from "../types";
import { isDataMapOptions, isResolverOptions } from "../types";
import { resolveSelectOptions } from "./resolveSelectOptions";

/**
 * Result returned by {@link useSelectOptions}.
 */
export interface UseSelectOptionsResult {
  /** Resolved options for the field. */
  options: SelectOption[];
  /** `true` while an async resolver is in flight. */
  isLoading: boolean;
  /** Error thrown by an async resolver, if any. */
  error?: unknown;
}

const EMPTY_OPTIONS: SelectOption[] = [];

/** Structural thenable check — more robust than `instanceof Promise` across realms. */
const isThenable = (value: unknown): value is Promise<SelectOption[]> =>
  typeof (value as { then?: unknown } | null)?.then === "function";

/**
 * Resolves a select field's `options` config into a reactive list of options,
 * reading form values and the resolver registry from the form context.
 *
 * - **static** / **data-map** resolve synchronously; data-map recomputes
 *   whenever the `sourceField` data changes (subscribed via `useWatch`).
 * - **resolver** options may be sync or async — `isLoading` reflects in-flight
 *   work and stale results are ignored on unmount or when the resolver changes.
 *   A resolver re-runs when the field's declared `dependsOn` value changes, so
 *   cascading selects (e.g. accounts that depend on a selected customer) stay
 *   in sync. Declare `dependsOn` on the field for resolvers that read other
 *   fields' values.
 * - When `config.options` is absent, returns an empty list and leaves the
 *   legacy `config.optionsSource` for the consumer's field component to handle.
 *
 * Intended to be consumed by a consumer-provided `select` field component.
 */
export function useSelectOptions(
  config: SelectFieldElement,
  fieldName: string
): UseSelectOptionsResult {
  const { form, components } = useDynamicFormContext();
  const options = config.options;

  // In-branch narrowing keeps the type guards authoritative (no `as` casts).
  const resolverName =
    options !== undefined && isResolverOptions(options) ? options.name : null;
  const sourceField =
    options !== undefined && isDataMapOptions(options)
      ? options.sourceField
      : undefined;
  const isResolver = resolverName !== null;

  // Single unconditional subscription that drives reactivity:
  // - data-map → watch the source array
  // - resolver → watch the field it declares a dependency on (`dependsOn`)
  // - otherwise → watch this field (bounded, no-op for static lists)
  const watchName = sourceField ?? config.dependsOn ?? fieldName;
  const watched = useWatch({ control: form.control, name: watchName });

  // Hold the resolver registry in a ref so the effect reads the latest
  // resolvers without re-running when the registry's object identity changes
  // (a consumer passing `components` inline would otherwise refetch every render).
  const resolversRef = useRef(components.resolvers);
  resolversRef.current = components.resolvers;

  const [resolverState, setResolverState] = useState<UseSelectOptionsResult>({
    options: EMPTY_OPTIONS,
    isLoading: false,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: `watched` is an intentional trigger — it re-runs the resolver when its declared `dependsOn` value changes; `resolvers` is read via a ref to avoid identity-churn refetches.
  useEffect(() => {
    if (resolverName === null) {
      return;
    }

    let cancelled = false;
    // Reconstruct a stable descriptor so the effect never closes over the
    // (possibly per-render) `options` object reference.
    const result = resolveSelectOptions(
      { type: "resolver", name: resolverName },
      {
        formValues: form.getValues(),
        fieldName,
        resolvers: resolversRef.current,
      }
    );

    if (isThenable(result)) {
      setResolverState({ options: EMPTY_OPTIONS, isLoading: true });
      result.then(
        (resolved) => {
          if (!cancelled) {
            setResolverState({ options: resolved, isLoading: false });
          }
        },
        (err) => {
          if (!cancelled) {
            setResolverState({
              options: EMPTY_OPTIONS,
              isLoading: false,
              error: err,
            });
          }
        }
      );
    } else {
      setResolverState({ options: result, isLoading: false });
    }

    return () => {
      cancelled = true;
    };
  }, [resolverName, fieldName, form, watched]);

  if (isResolver) {
    return resolverState;
  }

  // Static, data-map, and absent options all resolve synchronously here.
  // `useWatch` above re-runs render (and this resolution) on relevant changes.
  const resolved = resolveSelectOptions(options, {
    formValues: form.getValues(),
    fieldName,
  }) as SelectOption[];

  return { options: resolved, isLoading: false };
}
