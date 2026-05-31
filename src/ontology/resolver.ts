import type { Concept, Ontology } from "./types.js";

/**
 * Resolve the Concept for a note given its path relative to the vault root.
 *
 * Pure function. Takes the FIRST path segment as the folder key, looks it up
 * in the taxonomy, then resolves the concept by name from the ontology map.
 *
 * Returns `undefined` when:
 * - the folder is not declared in the taxonomy, or
 * - the binding's concept is null, or
 * - no matching concept exists in the ontology.
 */
export function resolveConcept(
  ontology: Ontology,
  notePath: string,
): Concept | undefined {
  // Normalize backslashes to forward slashes.
  const normalized = notePath.replace(/\\/g, "/");

  // Take the first path segment as the folder name.
  const slash = normalized.indexOf("/");
  const folder = slash === -1 ? normalized : normalized.slice(0, slash);

  if (!folder) return undefined;

  const binding = ontology.taxonomy.folders[folder];
  if (!binding) return undefined;

  const conceptRef = binding.concept;
  if (conceptRef === null || conceptRef === undefined) return undefined;

  if (Array.isArray(conceptRef)) {
    // Return the first resolvable concept name.
    for (const name of conceptRef) {
      const concept = ontology.concepts.get(name);
      if (concept) return concept;
    }
    return undefined;
  }

  return ontology.concepts.get(conceptRef);
}
