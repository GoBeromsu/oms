#!/usr/bin/env node
import { readFile, readdir, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stringify as yamlStringify, parse as yamlParse } from "yaml";
import { loadOntology } from "../ontology/loader.js";
import { resolveConcept } from "../ontology/resolver.js";
import { parseNote } from "../conventions/frontmatter.js";
import { validateFrontmatter } from "../conventions/validate.js";
import type { Taxonomy, FolderBinding } from "../ontology/types.js";

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the bundled `core/ontology` directory.
 * Both the built path (`dist/cli/`) and the source path (`src/cli/`) are two
 * levels beneath the repo root, so `../../core/ontology` works in both cases.
 */
function bundledOntologyDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "../../core/ontology");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Humanize a folder name: "references" → "References". */
function humanize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Walk a directory recursively, yielding relative paths for all .md files. */
async function* walkMarkdown(
  dir: string,
  base: string,
  skipDirs: Set<string>,
): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkMarkdown(full, base, skipDirs);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      yield path.relative(base, full).replace(/\\/g, "/");
    }
  }
}

// ---------------------------------------------------------------------------
// runSetup
// ---------------------------------------------------------------------------

export async function runSetup(opts: {
  vault: string;
  yes: boolean;
}): Promise<void> {
  const { vault, yes } = opts;
  const nonInteractive = yes || process.env["LEXA_NON_INTERACTIVE"] === "1";

  const ontologyDir = bundledOntologyDir();

  // Load shipped concepts so we can offer meaningful defaults.
  const ontology = await loadOntology(ontologyDir);

  // Scan vault top-level directories (skip dotfiles).
  const topEntries = await readdir(vault, { withFileTypes: true });
  const folders = topEntries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name);

  const folderBindings: Record<string, FolderBinding> = {};

  if (nonInteractive) {
    // Non-interactive: use defaults without readline.
    for (const folder of folders) {
      // Find a shipped concept whose folder field matches.
      let conceptName: string | null = null;
      for (const [name, concept] of ontology.concepts) {
        if (concept.folder === folder) {
          conceptName = name;
          break;
        }
      }
      folderBindings[folder] = {
        intent: humanize(folder),
        concept: conceptName,
      };
    }
  } else {
    // Interactive: ask intent and concept for each folder.
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const conceptNames = Array.from(ontology.concepts.keys());

    try {
      console.log("\nLexa Setup — adopting existing vault folders.\n");
      console.log(`Available shipped concepts: ${conceptNames.join(", ") || "(none)"}\n`);

      for (const folder of folders) {
        const defaultIntent = humanize(folder);
        const rawIntent = await rl.question(
          `Folder "${folder}" — intent [${defaultIntent}]: `,
        );
        const intent = rawIntent.trim() || defaultIntent;

        // Find default concept
        let defaultConcept: string | null = null;
        for (const [name, concept] of ontology.concepts) {
          if (concept.folder === folder) {
            defaultConcept = name;
            break;
          }
        }

        const conceptPrompt = defaultConcept
          ? `  Bind concept [${defaultConcept}] (blank = ${defaultConcept}, "null" = none): `
          : `  Bind concept (${conceptNames.join("/") || "none"}, blank = none): `;

        const rawConcept = await rl.question(conceptPrompt);
        const trimmed = rawConcept.trim();
        let conceptName: string | null;
        if (trimmed === "null" || trimmed === "") {
          conceptName = trimmed === "null" ? null : (defaultConcept ?? null);
        } else if (ontology.concepts.has(trimmed)) {
          conceptName = trimmed;
        } else {
          console.warn(`  Unknown concept "${trimmed}"; binding as null.`);
          conceptName = null;
        }

        folderBindings[folder] = { intent, concept: conceptName };
      }
    } finally {
      rl.close();
    }
  }

  const taxonomy: Taxonomy = { version: 0, folders: folderBindings };

  // Write the vault-local ontology. `.lexa/` IS the ontology directory:
  // `.lexa/taxonomy.yaml` + `.lexa/concepts/*.yaml`, matching loadOntology's
  // contract so `lexa doctor` can load it directly.
  const lexaDir = path.join(vault, ".lexa");
  const conceptsOutDir = path.join(lexaDir, "concepts");
  await mkdir(conceptsOutDir, { recursive: true });

  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(path.join(lexaDir, "taxonomy.yaml"), yamlStringify(taxonomy), "utf-8"),
  );

  // Copy shipped concept yaml files into vault/.lexa/concepts/
  const conceptsSourceDir = path.join(ontologyDir, "concepts");
  let copiedFiles: string[] = [];
  try {
    const conceptFiles = await readdir(conceptsSourceDir);
    for (const file of conceptFiles) {
      if (file.endsWith(".yaml") || file.endsWith(".yml")) {
        await copyFile(
          path.join(conceptsSourceDir, file),
          path.join(conceptsOutDir, file),
        );
        copiedFiles.push(file);
      }
    }
  } catch (err) {
    console.warn("[lexa] Could not copy concept files:", err);
  }

  // Summary
  console.log(`\nLexa setup complete.`);
  console.log(`  Vault:    ${vault}`);
  console.log(`  Written:  ${path.join(lexaDir, "taxonomy.yaml")}`);
  console.log(`  Concepts: ${copiedFiles.join(", ") || "(none)"}`);
  console.log(`  Folders:  ${Object.keys(folderBindings).join(", ") || "(none)"}`);
  console.log(`\nRun "npx lexa doctor" to validate existing notes.\n`);
}

// ---------------------------------------------------------------------------
// runDoctor
// ---------------------------------------------------------------------------

export async function runDoctor(opts: { vault: string }): Promise<number> {
  const { vault } = opts;

  // Doctor is non-blocking (onViolation: warn). It must ALWAYS exit 0 in v0,
  // even if the ontology is missing or unparseable — wrap the whole body so a
  // failure surfaces as a warning, never a non-zero exit.
  try {
    // Load ontology: prefer the vault-local `.lexa/` ontology, fall back to the
    // bundled defaults. The vault-local layout is `.lexa/taxonomy.yaml` +
    // `.lexa/concepts/`, so `.lexa/` itself is the ontology dir.
    const localOntologyDir = path.join(vault, ".lexa");
    let ontologyDir: string;
    try {
      await readdir(path.join(localOntologyDir, "concepts"));
      ontologyDir = localOntologyDir;
    } catch {
      ontologyDir = bundledOntologyDir();
    }

    const ontology = await loadOntology(ontologyDir);

    const skipDirs = new Set(["node_modules"]);
    let totalNotes = 0;
    let totalViolations = 0;
    let notesWithViolations = 0;

    for await (const relPath of walkMarkdown(vault, vault, skipDirs)) {
      const concept = resolveConcept(ontology, relPath);
      if (!concept) continue;

      totalNotes++;
      const fullPath = path.join(vault, relPath);
      let raw: string;
      try {
        raw = await readFile(fullPath, "utf-8");
      } catch {
        console.warn(`[lexa] Could not read ${relPath}`);
        continue;
      }

      const { frontmatter } = parseNote(raw);
      const result = validateFrontmatter(frontmatter, concept);

      if (result.violations.length > 0) {
        notesWithViolations++;
        totalViolations += result.violations.length;
        console.log(`\n  ${relPath} [concept: ${concept.concept}]`);
        for (const v of result.violations) {
          console.log(`    [${v.rule}] ${v.message}`);
        }
      }
    }

    console.log(
      `\nLexa doctor: ${totalNotes} notes checked, ${notesWithViolations} with violations, ${totalViolations} total violations.`,
    );
    console.log("All violations are warnings (onViolation: warn). Exit 0.\n");
  } catch (err) {
    console.warn("[lexa] doctor could not complete:", err);
  }

  // Always exit 0 in v0 (non-blocking, onViolation: warn).
  return 0;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.log(`
lexa — convention layer for Obsidian vaults

Usage:
  lexa setup [--vault <path>] [--yes]
  lexa doctor [--vault <path>]

Commands:
  setup    Adopt an existing vault into the Lexa convention.
  doctor   Validate vault notes against the active ontology.

Options:
  --vault <path>   Path to the vault root (default: current directory).
  --yes            Non-interactive: accept all defaults (setup only).
`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];

  // Parse --vault and --yes flags.
  let vault = process.cwd();
  let yes = false;

  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--vault" && argv[i + 1]) {
      vault = path.resolve(argv[i + 1]!);
      i++;
    } else if (argv[i] === "--yes") {
      yes = true;
    }
  }

  if (command === "setup") {
    await runSetup({ vault, yes });
  } else if (command === "doctor") {
    process.exitCode = await runDoctor({ vault });
  } else {
    printUsage();
    process.exitCode = 0;
  }
}

// Guard: only run main() when this file is the entry point.
// Works for both source (`src/cli/lexa.ts`) and built (`dist/cli/lexa.js`) paths.
const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1] === __filename ||
    process.argv[1] === __filename.replace(/\.ts$/, ".js") ||
    path.resolve(process.argv[1]) === __filename);

if (isMain) {
  main().catch((err: unknown) => {
    console.error("[lexa] Fatal error:", err);
    process.exitCode = 1;
  });
}
