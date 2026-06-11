import type {
  FallbackComponent,
  FallbackComponentRegistry,
  MissingComponentKind,
} from "../types";

export const resolveFallbackComponent = (
  fallback: FallbackComponentRegistry | undefined,
  kind: MissingComponentKind
): FallbackComponent | undefined => {
  if (kind === "custom") {
    return fallback?.custom ?? fallback?.all;
  }

  return fallback?.field ?? fallback?.all;
};

export const hasFallbackComponent = (
  fallback: FallbackComponentRegistry | undefined,
  kind: MissingComponentKind
): boolean => Boolean(resolveFallbackComponent(fallback, kind));
