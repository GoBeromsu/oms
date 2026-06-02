/**
 * Oh My Second Brain convention format — the semantic ontology, adapted from ouroboros.
 *
 * A vault's convention is declarative data the user owns (lives in `vault/.oms/`).
 * Oh My Second Brain ships defaults in `core/ontology/` and enforces whatever the user declares.
 *
 * The format is deliberately semantic, not structural: every concept and folder
 * carries a declared `intent` so a host agent reads *why* knowledge lives somewhere,
 * not just *where*. "The folder itself is information."
 */

/** Supported scalar/collection kinds for a frontmatter field. */
export type FieldType = "string" | "url" | "date" | "list" | "number" | "boolean";

/** Optional normalization applied to a field value before/at validation. */
export type Normalize = "kebab" | "lower" | "trim";

/**
 * One frontmatter key, modeled on ouroboros's `OntologyField`.
 * Each field is itself a unit of convention — users grow a convention field-by-field.
 */
export interface OntologyField {
  /** The frontmatter key name. */
  name: string;
  /** Value kind. */
  type: FieldType;
  /** Whether the key must be present and non-empty. Defaults to false. */
  required?: boolean;
  /** Semantic intent: what this field is FOR (ouroboros `description`). */
  intent: string;
  /** Optional value normalization for list/string fields. */
  normalize?: Normalize;
  /** If true, the field must not change once written (advisory in v0). */
  immutable?: boolean;
}

/**
 * A pre-declared, named retrieval view — NOT a query filter.
 * Mirrors ouroboros's `OntologyLens`: a concept declares which fields matter
 * for which retrieval purpose (e.g. `synthesis`, `audit`).
 */
export interface OntologyLens {
  name: string;
  /** When this lens should be activated during retrieval. */
  intent: string;
  /** Subset of the concept's field names surfaced by this lens. */
  fields: string[];
}

/** A note-type carrying explicit intent, its fields, lenses, and folder binding. */
export interface Concept {
  /** Concept identifier (e.g. `literature`). */
  concept: string;
  /** What this knowledge is FOR. */
  intent: string;
  /** Folder this concept is bound to (relative to vault root). */
  folder: string;
  fields: OntologyField[];
  lenses?: OntologyLens[];
}

/** Per-folder declaration: a folder is information, so it declares its intent. */
export interface FolderBinding {
  /** Why this folder exists / what kind of knowledge it holds. */
  intent: string;
  /** Concept name(s) bound here, or null when not yet assigned (e.g. `inbox`). */
  concept: string | string[] | null;
}

/** Folder ↔ concept map with per-folder intent. */
export interface Taxonomy {
  version: number;
  folders: Record<string, FolderBinding>;
}

/** A fully loaded convention: the taxonomy plus every concept, keyed by name. */
export interface Ontology {
  taxonomy: Taxonomy;
  concepts: Map<string, Concept>;
}
