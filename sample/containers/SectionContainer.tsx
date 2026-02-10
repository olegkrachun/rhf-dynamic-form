import type { ContainerComponent } from "../../src";

/**
 * Section container — renders a titled card-like section.
 * Reads `title`, `description`, `collapsible` from meta.
 */
export const SectionContainer: ContainerComponent = ({ config, children }) => {
  const title = config.meta?.title as string | undefined;
  const description = config.meta?.description as string | undefined;

  return (
    <fieldset
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "1.25rem",
        marginBottom: "1rem",
      }}
    >
      {title && (
        <legend
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            padding: "0 0.5rem",
          }}
        >
          {title}
        </legend>
      )}
      {description && (
        <p
          style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1rem" }}
        >
          {description}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {children}
      </div>
    </fieldset>
  );
};

SectionContainer.displayName = "SectionContainer";
