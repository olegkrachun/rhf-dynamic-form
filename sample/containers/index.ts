import type { CustomContainerRegistry } from "../../src";
import { ColumnContainer } from "./ColumnContainer";
import { Container } from "./Container";
import { RowContainer } from "./RowContainer";
import { SectionContainer } from "./SectionContainer";

/**
 * Sample container registry.
 *
 * Each variant maps to a container component:
 * - "default"  → plain wrapper (no layout assumptions)
 * - "row"      → horizontal flex row with gap
 * - "column"   → vertical flex column with optional width
 * - "section"  → titled card/fieldset with description
 */
export const sampleContainerComponents: CustomContainerRegistry = {
  default: Container,
  row: RowContainer,
  column: ColumnContainer,
  section: SectionContainer,
};

export { ColumnContainer } from "./ColumnContainer";
export { Container } from "./Container";
export { RowContainer } from "./RowContainer";
export { SectionContainer } from "./SectionContainer";
