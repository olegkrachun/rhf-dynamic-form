import type { ContainerComponent } from "../../src";

/**
 * Row container — renders children in a horizontal flex row with gap.
 * Reads `gap` from meta (default: "1rem").
 */
export const RowContainer: ContainerComponent = ({ config, children }) => {
  const rawGap = config.meta?.gap;
  const gap = typeof rawGap === "string" ? rawGap : "1rem";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap,
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  );
};

RowContainer.displayName = "RowContainer";
