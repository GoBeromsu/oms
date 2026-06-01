#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, mkdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const args = new Set(process.argv.slice(2));
const runSetup = !args.has("--mcp-only");
const runMcp = !args.has("--setup-only");

function fail(message) {
  console.error(`[release:artifact-smoke] ${message}`);
  process.exit(1);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf-8",
    ...options,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    process.stdout.write(result.stdout ?? "");
    fail(`${command} ${commandArgs.join(" ")} failed with exit ${result.status}`);
  }
  return result;
}

function packTarball() {
  const result = run("npm", ["pack", "--json"]);
  let packs;
  try {
    packs = JSON.parse(result.stdout);
  } catch (error) {
    fail(`could not parse npm pack JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const filename = packs?.[0]?.filename;
  if (!filename) fail("npm pack JSON did not include filename");
  return path.resolve(filename);
}

function extractPackage(tarball, tempRoot) {
  run("tar", ["-xzf", tarball, "-C", tempRoot]);
  const packageRoot = path.join(tempRoot, "package");
  if (!existsSync(packageRoot)) fail("tarball did not extract to package/");
  return packageRoot;
}

function assertPath(target, label = target) {
  if (!existsSync(target)) fail(`missing ${label}: ${target}`);
}

function installRuntimeDependencies(packageRoot) {
  run("npm", ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: packageRoot,
    stdio: "inherit",
  });
}

function makeVault(tempRoot) {
  const vault = path.join(tempRoot, "Vault");
  mkdirSync(path.join(vault, "Inbox"), { recursive: true });
  mkdirSync(path.join(vault, "Literature"), { recursive: true });
  return vault;
}

function setupSmoke(packageRoot, vault) {
  const cli = path.join(packageRoot, "dist/cli/lexa.js");
  const result = run(process.execPath, [cli, "setup", "--vault", vault, "--yes", "--install-claude"], {
    cwd: packageRoot,
  });
  const output = `${result.stdout}\n${result.stderr}`;
  assertPath(path.join(vault, ".lexa/taxonomy.yaml"), "vault taxonomy");
  assertPath(path.join(vault, ".lexa/concepts"), "vault concepts directory");
  if (!output.includes("claude plugin install")) fail("setup output did not include Claude plugin install command");
  if (!output.includes("claude mcp add lexa -- npx @goberomsu/lexa mcp --vault")) fail("setup output did not include Claude MCP registration command");
  const pluginPathLine = output.split(/\r?\n/).find((line) => line.includes("Plugin path:"));
  if (!pluginPathLine) fail("setup output did not include Plugin path line");
  const pluginPath = pluginPathLine.replace(/^.*Plugin path:\s*/, "").trim();
  assertPath(path.join(pluginPath, ".claude-plugin/plugin.json"), "printed Claude plugin manifest path");
  const expectedRoot = path.join(packageRoot, "adapters/claude-code");
  if (realpathSync(path.resolve(pluginPath)) !== realpathSync(path.resolve(expectedRoot))) {
    fail(`printed plugin path must resolve inside extracted package: expected ${expectedRoot}, got ${pluginPath}`);
  }
  console.log("[release:artifact-smoke] ok: setup dry-run works from unpacked package.");
}

function hostInstallSmoke(packageRoot, vault) {
  const cli = path.join(packageRoot, "dist/cli/lexa.js");
  const result = run(process.execPath, [cli, "install", "--runtime", "all", "--vault", vault, "--dry-run"], {
    cwd: packageRoot,
  });
  const output = `${result.stdout}\n${result.stderr}`;
  for (const expected of ["claude install", "codex install", "hermes install", "rules/lexa.md", "skills/knowledge-management/lexa"]) {
    if (!output.includes(expected)) fail(`host install dry-run did not include ${expected}`);
  }
  console.log("[release:artifact-smoke] ok: host install dry-run works from unpacked package.");
}

async function mcpSmoke(packageRoot, vault) {
  const cli = path.join(packageRoot, "dist/cli/lexa.js");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli, "mcp", "--vault", vault],
    cwd: packageRoot,
  });
  const client = new Client({ name: "lexa-release-artifact-smoke", version: "0.0.0" });
  try {
    await client.connect(transport);
    const result = await client.listTools();
    const toolNames = new Set(result.tools.map((tool) => tool.name));
    const requiredTools = [
      "lexa_graph_status",
      "lexa_graph_build",
      "lexa_list_concepts",
      "lexa_retrieve_by_axis",
      "lexa_lazy_load_note",
      "lexa_validate_contract",
      "lexa_capture_prepare",
      "lexa_capture_commit",
    ];
    const missing = requiredTools.filter((tool) => !toolNames.has(tool));
    if (missing.length > 0) fail(`MCP server missing tools: ${missing.join(", ")}`);
    console.log("[release:artifact-smoke] ok: MCP listTools works from unpacked package.");
  } finally {
    await client.close();
  }
}

const tempRoot = mkdtempSync(path.join(tmpdir(), "lexa-release-smoke-"));
let tarball;
try {
  tarball = packTarball();
  const packageRoot = extractPackage(tarball, tempRoot);
  assertPath(path.join(packageRoot, "dist"), "dist directory");
  assertPath(path.join(packageRoot, "core"), "core directory");
  assertPath(path.join(packageRoot, "adapters/claude-code/.claude-plugin/plugin.json"), "Claude plugin manifest");
  assertPath(path.join(packageRoot, "adapters/codex/rules/lexa.md"), "Codex Lexa rule");
  assertPath(path.join(packageRoot, "adapters/codex/skills/lexa-capture/SKILL.md"), "Codex Lexa capture skill");
  assertPath(path.join(packageRoot, "adapters/hermes/skills/capture/SKILL.md"), "Hermes Lexa capture skill");
  assertPath(path.join(packageRoot, "docs/install.md"), "install docs");
  assertPath(path.join(packageRoot, "docs/release.md"), "release docs");
  assertPath(path.join(packageRoot, "scripts/install.sh"), "install shell script");
  assertPath(path.join(packageRoot, "scripts/uninstall.sh"), "uninstall shell script");
  installRuntimeDependencies(packageRoot);
  const vault = makeVault(tempRoot);
  if (runSetup) {
    setupSmoke(packageRoot, vault);
    hostInstallSmoke(packageRoot, vault);
  }
  if (runMcp) await mcpSmoke(packageRoot, vault);
} finally {
  if (tarball && existsSync(tarball)) rmSync(tarball, { force: true });
  rmSync(tempRoot, { recursive: true, force: true });
}
