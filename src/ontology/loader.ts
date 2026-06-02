import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { Concept, Ontology, Taxonomy } from "./types.js";

/**
 * Load an Oh My Second Brain ontology from a directory that contains:
 *   <ontologyDir>/taxonomy.yaml
 *   <ontologyDir>/concepts/*.yaml
 *
 * Lenient:
 * - Missing `taxonomy.version` defaults to 0.
 * - A taxonomy folder that references an unknown concept name is warned and skipped.
 * - Missing optional concept keys default sensibly.
 * - Never throws (barring genuine I/O errors).
 */
export async function loadOntology(ontologyDir: string): Promise<Ontology> {
  // ── taxonomy ──────────────────────────────────────────────────────────────
  const taxonomyPath = path.join(ontologyDir, "taxonomy.yaml");
  const taxonomyRaw = await readFile(taxonomyPath, "utf-8");
  const taxonomyParsed = parseYaml(taxonomyRaw) as Record<string, unknown>;

  const taxonomy: Taxonomy = {
    version:
      typeof taxonomyParsed["version"] === "number"
        ? taxonomyParsed["version"]
        : 0,
    folders:
      taxonomyParsed["folders"] != null &&
      typeof taxonomyParsed["folders"] === "object" &&
      !Array.isArray(taxonomyParsed["folders"])
        ? (taxonomyParsed["folders"] as Taxonomy["folders"])
        : {},
  };

  // ── concepts ──────────────────────────────────────────────────────────────
  const conceptsDir = path.join(ontologyDir, "concepts");
  const entries = await readdir(conceptsDir);
  const yamlFiles = entries.filter((e) => e.endsWith(".yaml") || e.endsWith(".yml"));

  const concepts = new Map<string, Concept>();

  for (const file of yamlFiles) {
    const filePath = path.join(conceptsDir, file);
    const raw = await readFile(filePath, "utf-8");
    const parsed = parseYaml(raw) as Record<string, unknown>;

    const concept: Concept = {
      concept: typeof parsed["concept"] === "string" ? parsed["concept"] : path.basename(file, path.extname(file)),
      intent: typeof parsed["intent"] === "string" ? parsed["intent"] : "",
      folder: typeof parsed["folder"] === "string" ? parsed["folder"] : "",
      fields: Array.isArray(parsed["fields"]) ? (parsed["fields"] as Concept["fields"]) : [],
      lenses: Array.isArray(parsed["lenses"]) ? (parsed["lenses"] as Concept["lenses"]) : [],
    };

    concepts.set(concept.concept, concept);
  }

  // Warn if a taxonomy folder references a concept name not in the map.
  for (const [folder, binding] of Object.entries(taxonomy.folders)) {
    const names = binding.concept == null
      ? []
      : Array.isArray(binding.concept)
        ? binding.concept
        : [binding.concept];

    for (const name of names) {
      if (!concepts.has(name)) {
        console.warn(
          `[oms] taxonomy folder "${folder}" references unknown concept "${name}" — skipping.`,
        );
      }
    }
  }

  return { taxonomy, concepts };
}
