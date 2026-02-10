import type { ContainerComponent } from "../../src";

/**
 * Column container — renders children stacked vertically.
 * Reads `width` from meta for use inside a row.
 */
export const ColumnContainer: ContainerComponent = ({ config, children }) => {
  const width = (config.meta?.width as string) ?? "auto";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        width,
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
};

ColumnContainer.displayName = "ColumnContainer";
