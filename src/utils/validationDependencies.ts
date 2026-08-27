import type { FormConfiguration } from "../types";
import { collectVars } from "./collectVars";
import { flattenFields } from "./flattenFields";

const cache = new WeakMap<FormConfiguration, Record<string, string[]>>();

const buildValidationDependencies = (config: FormConfiguration) => {
  const dependencySets: Record<string, Set<string>> = {};

  for (const target of flattenFields(config.elements)) {
    const condition = target.validation?.condition;
    if (!condition) {
      continue;
    }

    for (const sourceName of collectVars(condition)) {
      if (sourceName === target.name) {
        continue;
      }
      if (!dependencySets[sourceName]) {
        dependencySets[sourceName] = new Set();
      }
      dependencySets[sourceName].add(target.name);
    }
  }

  return Object.fromEntries(
    Object.entries(dependencySets).map(([sourceName, targets]) => [
      sourceName,
      Array.from(targets),
    ])
  );
};

export const getValidationDependents = (
  config: FormConfiguration,
  sourceName: string
): string[] | undefined => {
  let dependencies = cache.get(config);
  if (!dependencies) {
    dependencies = buildValidationDependencies(config);
    cache.set(config, dependencies);
  }
  return dependencies[sourceName];
};
