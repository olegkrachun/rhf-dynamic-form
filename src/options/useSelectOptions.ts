import { useEffect, useState } from "react";
import { useWatch } from "react-hook-form";
import { useDynamicFormContext } from "../hooks";
import type {
  DataMapOptions,
  ResolverOptions,
  SelectFieldElement,
  SelectOption,
} from "../types";
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

/**
 * Resolves a select field's `options` config into a reactive list of options,
 * reading form values and the resolver registry from the form context.
 *
 * - **static** / **data-map** resolve synchronously; data-map recomputes
 *   whenever the `sourceField` data changes (subscribed via `useWatch`).
 * - **resolver** options may be async — `isLoading` reflects in-flight work and
 *   stale results are ignored on unmount or when the resolver changes.
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
  const resolvers = components.resolvers;

  const isResolver = options !== undefined && isResolverOptions(options);
  // Stable resolver identity. Depending on the parsed `options` object directly
  // would re-run the effect on every render if a consumer rebuilds config
  // inline; the resolver name is the only field that meaningfully changes it.
  const resolverName = isResolver ? (options as ResolverOptions).name : null;

  // Single unconditional subscription. For data-map, watch the source array so
  // options recompute when it changes; otherwise watch this field (bounded).
  const watchName =
    options !== undefined && isDataMapOptions(options)
      ? (options as DataMapOptions).sourceField
      : fieldName;
  useWatch({ control: form.control, name: watchName });

  const [resolverState, setResolverState] = useState<UseSelectOptionsResult>({
    options: EMPTY_OPTIONS,
    isLoading: false,
  });

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
        resolvers,
      }
    );

    if (result instanceof Promise) {
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
  }, [resolverName, resolvers, fieldName, form]);

  if (isResolver) {
    return resolverState;
  }

  // Static, data-map, and absent options all resolve synchronously here.
  // `useWatch` above re-runs render (and this resolution) on relevant changes.
  const resolved = resolveSelectOptions(options, {
    formValues: form.getValues(),
    fieldName,
    resolvers,
  }) as SelectOption[];

  return { options: resolved, isLoading: false };
}
