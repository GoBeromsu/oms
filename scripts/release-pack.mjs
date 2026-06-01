#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

function fail(message) {
  console.error(`[release:pack] ${message}`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf-8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    process.stdout.write(result.stdout ?? "");
    fail(`${command} ${args.join(" ")} failed with exit ${result.status}`);
  }
  return result.stdout;
}

function hasPath(files, requiredPath) {
  return files.some((file) => file.path === requiredPath || file.path.startsWith(`${requiredPath}/`));
}

const stdout = run("npm", ["pack", "--dry-run", "--json"]);
let packs;
try {
  packs = JSON.parse(stdout);
} catch (error) {
  fail(`could not parse npm pack JSON: ${error instanceof Error ? error.message : String(error)}`);
}

const pack = packs?.[0];
if (!pack || !Array.isArray(pack.files)) {
  fail("npm pack JSON did not include a files array");
}

const files = pack.files;
const required = [
  "package.json",
  "dist/cli/lexa.js",
  "dist/mcp/server.js",
  "core/ontology/taxonomy.yaml",
  "core/ontology/concepts",
  "adapters/claude-code/.claude-plugin/plugin.json",
  "adapters/claude-code/skills/setup/SKILL.md",
  "adapters/claude-code/skills/doctor/SKILL.md",
  "adapters/claude-code/skills/define/SKILL.md",
  "adapters/claude-code/skills/capture/SKILL.md",
  "adapters/claude-code/skills/retrieve/SKILL.md",
  "adapters/claude-code/skills/uninstall/SKILL.md",
  "adapters/codex/.codex-plugin/plugin.json",
  "adapters/codex/.mcp.json",
  "adapters/codex/rules/lexa.md",
  "adapters/codex/skills/lexa-setup/SKILL.md",
  "adapters/codex/skills/lexa-capture/SKILL.md",
  "adapters/codex/skills/lexa-retrieve/SKILL.md",
  "adapters/hermes/manifest.json",
  "adapters/hermes/skills/setup/SKILL.md",
  "adapters/hermes/skills/capture/SKILL.md",
  "adapters/hermes/skills/retrieve/SKILL.md",
  "docs/install.md",
  "docs/release.md",
  "scripts/install.sh",
  "scripts/uninstall.sh",
];

const missing = required.filter((requiredPath) => !hasPath(files, requiredPath));
if (missing.length > 0) {
  fail(`package tarball is missing required release assets:\n${missing.map((item) => `  - ${item}`).join("\n")}\nUpdate package.json files or create the missing release docs.`);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
const pluginJson = JSON.parse(readFileSync("adapters/claude-code/.claude-plugin/plugin.json", "utf-8"));
if (packageJson.version !== pluginJson.version) {
  fail(`version mismatch: package.json=${packageJson.version}, Claude plugin=${pluginJson.version}`);
}
const codexPluginJson = JSON.parse(readFileSync("adapters/codex/.codex-plugin/plugin.json", "utf-8"));
if (packageJson.version !== codexPluginJson.version) {
  fail(`version mismatch: package.json=${packageJson.version}, Codex plugin=${codexPluginJson.version}`);
}
const hermesManifestJson = JSON.parse(readFileSync("adapters/hermes/manifest.json", "utf-8"));
if (packageJson.version !== hermesManifestJson.version) {
  fail(`version mismatch: package.json=${packageJson.version}, Hermes manifest=${hermesManifestJson.version}`);
}

console.log(`[release:pack] ok: ${pack.filename} includes ${files.length} files and required release assets.`);
