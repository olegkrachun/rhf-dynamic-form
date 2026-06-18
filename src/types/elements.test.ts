import { describe, expect, it } from "vitest";
import {
  type DataMapOptions,
  isDataMapOptions,
  isResolverOptions,
  isStaticOptions,
  type ResolverOptions,
  type SelectOption,
  type SelectOptionsConfig,
} from "./elements";

const staticOptions: SelectOption[] = [
  { label: "Chase", value: "chase" },
  { label: "Citibank", value: "citi" },
];

const dataMapOptions: DataMapOptions = {
  sourceField: "data.bankAccounts",
  labelPath: "bankName",
  valuePath: "bankAccountNumber",
};

const primitiveDataMapOptions: DataMapOptions = {
  sourceField: "data.bankAccounts",
};

const resolverOptions: ResolverOptions = {
  type: "resolver",
  name: "bankAccountsResolver",
};

describe("SelectOptionsConfig type guards", () => {
  it("isStaticOptions is true only for arrays", () => {
    expect(isStaticOptions(staticOptions)).toBe(true);
    expect(isStaticOptions([])).toBe(true);
    expect(isStaticOptions(dataMapOptions)).toBe(false);
    expect(isStaticOptions(resolverOptions)).toBe(false);
  });

  it("isResolverOptions is true only for { type: 'resolver' }", () => {
    expect(isResolverOptions(resolverOptions)).toBe(true);
    expect(isResolverOptions(staticOptions)).toBe(false);
    expect(isResolverOptions(dataMapOptions)).toBe(false);
  });

  it("isDataMapOptions is true only for sourceField descriptors", () => {
    expect(isDataMapOptions(dataMapOptions)).toBe(true);
    expect(isDataMapOptions(primitiveDataMapOptions)).toBe(true);
    expect(isDataMapOptions(staticOptions)).toBe(false);
    expect(isDataMapOptions(resolverOptions)).toBe(false);
  });

  it("classifies each shape into exactly one guard", () => {
    const configs: SelectOptionsConfig[] = [
      staticOptions,
      dataMapOptions,
      primitiveDataMapOptions,
      resolverOptions,
    ];
    for (const config of configs) {
      const matches = [
        isStaticOptions(config),
        isResolverOptions(config),
        isDataMapOptions(config),
      ].filter(Boolean);
      expect(matches).toHaveLength(1);
    }
  });

  it("narrows types for the compiler", () => {
    const config: SelectOptionsConfig = dataMapOptions;
    if (isDataMapOptions(config)) {
      // Type narrowed to DataMapOptions — accessing sourceField must compile.
      expect(config.sourceField).toBe("data.bankAccounts");
    } else {
      throw new Error("expected data-map narrowing");
    }
  });
});
