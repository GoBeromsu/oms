#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { readFile, readdir, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stringify as yamlStringify, parse as yamlParse } from "yaml";
import { loadOntology } from "../ontology/loader.js";
import { resolveConcept } from "../ontology/resolver.js";
import { parseNote } from "../conventions/frontmatter.js";
import { validateFrontmatter } from "../conventions/validate.js";
import { runMcpServer } from "../mcp/server.js";
import {
  formatHostOperationResults,
  runHostOperation,
  type RuntimeSelection,
} from "../install/hosts.js";
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

/**
 * Resolve the bundled Claude Code adapter directory.
 * Kept parallel to bundledOntologyDir so source and built paths both work.
 */
function bundledClaudeAdapterDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "../../adapters/claude-code");
}

/**
 * Resolve the bundled `adapters` root so host installers can copy the
 * runtime-specific adapter assets from either source or dist execution.
 */
function bundledAdapterRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "../../adapters");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Humanize a folder name: "references" → "References". */
function humanize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Quote a value for copy/pasteable POSIX shell commands. */
function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_/:=.,@%+-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export interface ClaudeInstallPlan {
  pluginPath: string;
  pluginInstallCommand: string;
  mcpRegistrationCommand: string;
  mcpRuntimeStatus: "read-status-runtime";
}

export function buildClaudeInstallPlan(opts: { vault: string }): ClaudeInstallPlan {
  const pluginPath = bundledClaudeAdapterDir();
  return {
    pluginPath,
    pluginInstallCommand: `claude plugin install ${shellQuote(pluginPath)}`,
    mcpRegistrationCommand: `claude mcp add oms -- oms mcp --vault ${shellQuote(opts.vault)}`,
    mcpRuntimeStatus: "read-status-runtime",
  };
}

function printClaudeInstallPlan(plan: ClaudeInstallPlan): void {
  console.log("Claude Code harness install plan (dry-run).");
  console.log(`  Plugin path: ${plan.pluginPath}`);
  console.log(`  Plugin command: ${plan.pluginInstallCommand}`);
  console.log(`  MCP command: ${plan.mcpRegistrationCommand}`);
  console.log(
    "  MCP status: status/read/cache/retrieval plus safe capture; commit is gated by vault confinement and contract validation.",
  );
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
  installClaude?: boolean;
}): Promise<void> {
  const { vault, yes, installClaude = false } = opts;
  const nonInteractive = yes || process.env["OMS_NON_INTERACTIVE"] === "1";

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
      console.log("\nOh My Second Brain Setup — adopting existing vault folders.\n");
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

  // Write the vault-local ontology. ``.oms/` IS the ontology directory:
  // `.oms/taxonomy.yaml` + `.oms/concepts/*.yaml`, matching loadOntology's
  // contract so `oms doctor` can load it directly.
  const omsDir = path.join(vault, ".oms");
  const conceptsOutDir = path.join(omsDir, "concepts");
  await mkdir(conceptsOutDir, { recursive: true });

  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(path.join(omsDir, "taxonomy.yaml"), yamlStringify(taxonomy), "utf-8"),
  );

  // Copy shipped concept yaml files into vault/.oms/concepts/
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
    console.warn("[oms] Could not copy concept files:", err);
  }

  // Summary
  console.log(`\nOh My Second Brain setup complete.`);
  console.log(`  Vault:    ${vault}`);
  console.log(`  Written:  ${path.join(omsDir, "taxonomy.yaml")}`);
  console.log(`  Concepts: ${copiedFiles.join(", ") || "(none)"}`);
  console.log(`  Folders:  ${Object.keys(folderBindings).join(", ") || "(none)"}`);
  console.log(`\nRun "oh-my-second-brain doctor" to validate existing notes.\n`);

  if (installClaude) {
    printClaudeInstallPlan(buildClaudeInstallPlan({ vault }));
    console.log("");
  }
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
    // Load ontology: prefer the vault-local `.oms/` ontology, fall back to the
    // bundled defaults. The vault-local layout is `.oms/taxonomy.yaml` +
    // `.oms/concepts/`, so `.oms/` itself is the ontology dir.
    const localOntologyDir = path.join(vault, ".oms");
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
        console.warn(`[oms] Could not read ${relPath}`);
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
      `\nOh My Second Brain doctor: ${totalNotes} notes checked, ${notesWithViolations} with violations, ${totalViolations} total violations.`,
    );
    console.log("All violations are warnings (onViolation: warn). Exit 0.\n");
  } catch (err) {
    console.warn("[oms] doctor could not complete:", err);
  }

  // Always exit 0 in v0 (non-blocking, onViolation: warn).
  return 0;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.log(`
oh-my-second-brain — Oh My Second Brain convention layer for Obsidian vaults

Usage:
  oh-my-second-brain setup [--vault <path>] [--yes] [--install-claude]
  oh-my-second-brain install [--vault <path>] [--runtime <auto|all|claude|codex|hermes>] [--dry-run] [--execute] [--yes]
  oh-my-second-brain uninstall [--runtime <all|claude|codex|hermes>] [--dry-run] [--execute] [--yes]
  oh-my-second-brain doctor [--vault <path>]
  oh-my-second-brain mcp [--vault <path>]

Compatibility alias: oms <command>

Commands:
  setup    Adopt an existing vault into the Oh My Second Brain convention.
  install  Install Oh My Second Brain host adapters and MCP registration.
  uninstall Remove Oh My Second Brain host adapters and MCP registration.
  doctor   Validate vault notes against the active ontology.
  mcp      Start the read/status MCP stdio server.

Options:
  --vault <path>   Path to the vault root (default: current directory).
  --yes            Non-interactive: accept all defaults (setup only).
  --install-claude Print Claude Code plugin install and MCP registration commands (dry-run).
  --runtime <name> Select host runtime (default: auto for install, all for uninstall).
  --dry-run        Preview host config changes without writing files.
  --execute        Allow external host CLIs such as \`claude\` to run when available.
`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];

  // Parse shared flags.
  let vault = process.cwd();
  let yes = false;
  let installClaude = false;
  let runtime: RuntimeSelection | undefined;
  let dryRun = false;
  let executeExternal = false;

  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--vault" && argv[i + 1]) {
      vault = path.resolve(argv[i + 1]!);
      i++;
    } else if (argv[i] === "--yes") {
      yes = true;
    } else if (argv[i] === "--install-claude") {
      installClaude = true;
    } else if (argv[i] === "--runtime" && argv[i + 1]) {
      const rawRuntime = argv[i + 1]!;
      if (
        rawRuntime === "auto" ||
        rawRuntime === "all" ||
        rawRuntime === "claude" ||
        rawRuntime === "codex" ||
        rawRuntime === "hermes"
      ) {
        runtime = rawRuntime;
      } else {
        console.error(`[oms] Unsupported runtime: ${rawRuntime}`);
        process.exitCode = 1;
        return;
      }
      i++;
    } else if (argv[i] === "--dry-run") {
      dryRun = true;
    } else if (argv[i] === "--execute") {
      executeExternal = true;
    }
  }

  if (command === "setup") {
    await runSetup({ vault, yes, installClaude });
  } else if (command === "install" || command === "uninstall") {
    const selectedRuntime = runtime ?? (command === "install" ? "auto" : "all");
    if (command === "uninstall" && !yes && !dryRun && process.env["OMS_NON_INTERACTIVE"] !== "1") {
      console.error("[oms] Refusing uninstall without --yes or --dry-run.");
      process.exitCode = 1;
      return;
    }
    const results = await runHostOperation({
      action: command,
      runtime: selectedRuntime,
      vault,
      dryRun,
      executeExternal,
      yes,
      adapterRoot: bundledAdapterRoot(),
    });
    console.log(formatHostOperationResults(results, dryRun));
  } else if (command === "doctor") {
    process.exitCode = await runDoctor({ vault });
  } else if (command === "mcp") {
    await runMcpServer({ vault });
  } else {
    printUsage();
    process.exitCode = 0;
  }
}

// Guard: only run main() when this file is the entry point.
// Works for both source (`src/cli/oms.ts`) and built (`dist/cli/oms.js`) paths.
const __filename = fileURLToPath(import.meta.url);

function sameEntrypoint(left: string, right: string): boolean {
  const resolvedLeft = path.resolve(left);
  const resolvedRight = path.resolve(right);
  if (resolvedLeft === resolvedRight) return true;
  try {
    return realpathSync(resolvedLeft) === realpathSync(resolvedRight);
  } catch {
    return false;
  }
}

const isMain =
  process.argv[1] !== undefined &&
  (sameEntrypoint(process.argv[1], __filename) ||
    sameEntrypoint(process.argv[1], __filename.replace(/\.ts$/, ".js")));

if (isMain) {
  main().catch((err: unknown) => {
    console.error("[oms] Fatal error:", err);
    process.exitCode = 1;
  });
}
