import {
  getNestedValue,
  type OptionsResolver,
  type SelectOption,
} from "../src";

/**
 * Demo data: city options grouped by country. In a real app this would be a
 * network request inside the resolver.
 */
const CITY_OPTIONS_BY_COUNTRY: Record<string, SelectOption[]> = {
  ua: [
    { value: "kyiv", label: "Kyiv" },
    { value: "lviv", label: "Lviv" },
    { value: "odesa", label: "Odesa" },
  ],
  us: [
    { value: "nyc", label: "New York" },
    { value: "la", label: "Los Angeles" },
    { value: "chicago", label: "Chicago" },
  ],
  de: [
    { value: "berlin", label: "Berlin" },
    { value: "munich", label: "Munich" },
  ],
  pl: [
    { value: "warsaw", label: "Warsaw" },
    { value: "krakow", label: "Krakow" },
  ],
};

const SIMULATED_FETCH_MS = 250;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Named option resolvers passed to the form via `components.resolvers`.
 * Invoked for select fields configured with `options: { type: "resolver", name }`.
 */
export const sampleResolvers: Record<string, OptionsResolver> = {
  /**
   * Async resolver: cities depend on the selected country. The select declares
   * `dependsOn: "source.country"`, so `useSelectOptions` re-runs this resolver
   * whenever the country changes. The artificial delay demonstrates the hook's
   * `isLoading` state and stale-result handling.
   */
  citiesByCountry: async ({ formValues }) => {
    const country = getNestedValue(formValues, "source.country");
    await delay(SIMULATED_FETCH_MS);
    return typeof country === "string"
      ? (CITY_OPTIONS_BY_COUNTRY[country] ?? [])
      : [];
  },
};
