import { spawnSync } from "node:child_process";
import { existsSync, lstatSync } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";

export type HostRuntime = "claude" | "codex" | "hermes";
export type RuntimeSelection = HostRuntime | "auto" | "all";
export type HostAction = "install" | "uninstall";

export interface HostOperationOptions {
  action: HostAction;
  runtime: RuntimeSelection;
  vault: string;
  packageSpec?: string;
  dryRun?: boolean;
  executeExternal?: boolean;
  yes?: boolean;
  homeDir?: string;
  adapterRoot: string;
}

export interface HostOperationResult {
  runtime: HostRuntime;
  action: HostAction;
  changed: boolean;
  skipped: boolean;
  paths: string[];
  commands: string[];
  messages: string[];
}

const HOSTS: HostRuntime[] = ["claude", "codex", "hermes"];
const MANAGED_CODEX_START = "# BEGIN LEXA MANAGED MCP";
const MANAGED_CODEX_END = "# END LEXA MANAGED MCP";
const DEFAULT_PACKAGE_SPEC =
  "https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz";
const CODEX_SKILL_PREFIX = "lexa-";
const CODEX_RULE_FILENAME = "lexa.md";
const HERMES_SKILL_CATEGORY = "knowledge-management";
const HERMES_SKILL_NAME = "lexa";

function commandExists(command: string): boolean {
  const result = spawnSync(process.platform === "win32" ? "where" : "command", process.platform === "win32" ? [command] : ["-v", command], {
    stdio: "ignore",
    shell: process.platform !== "win32",
  });
  return result.status === 0;
}

export function detectAvailableHosts(): HostRuntime[] {
  const detected: HostRuntime[] = [];
  if (commandExists("claude")) detected.push("claude");
  if (commandExists("codex")) detected.push("codex");
  if (commandExists("hermes")) detected.push("hermes");
  return detected;
}

export function resolveRuntimeSelection(selection: RuntimeSelection): HostRuntime[] {
  if (selection === "all") return [...HOSTS];
  if (selection === "auto") {
    const detected = detectAvailableHosts();
    return detected.length > 0 ? detected : ["claude"];
  }
  return [selection];
}

function hostHome(homeDir: string | undefined, dirname: string, envName: string): string {
  return process.env[envName] ? path.resolve(process.env[envName]!) : path.join(homeDir ?? homedir(), dirname);
}

function packageSpec(options: HostOperationOptions): string {
  return options.packageSpec ?? DEFAULT_PACKAGE_SPEC;
}

function mcpArgs(options: HostOperationOptions): string[] {
  return ["-y", packageSpec(options), "mcp", "--vault", options.vault];
}

function jsonString(value: string): string {
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonObject(file: string): Promise<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf-8")) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function writeJsonObject(file: string, data: Record<string, unknown>, dryRun: boolean): Promise<boolean> {
  if (dryRun) return false;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  return true;
}

async function readYamlObject(file: string): Promise<Record<string, unknown>> {
  try {
    const parsed = yamlParse(await readFile(file, "utf-8")) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function writeYamlObject(file: string, data: Record<string, unknown>, dryRun: boolean): Promise<boolean> {
  if (dryRun) return false;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, yamlStringify(data), "utf-8");
  return true;
}

function mcpServerEntry(options: HostOperationOptions): Record<string, unknown> {
  return {
    command: "npx",
    args: mcpArgs(options),
  };
}

function refuseSymlinkedLeaf(target: string): void {
  if (!existsSync(target)) return;
  if (lstatSync(target).isSymbolicLink()) {
    throw new Error(`Refusing to replace symlinked Lexa install target: ${target}`);
  }
}

async function replaceDirectory(source: string, target: string, dryRun: boolean): Promise<boolean> {
  if (dryRun) return false;
  refuseSymlinkedLeaf(target);
  await rm(target, { recursive: true, force: true });
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
  return true;
}

async function upsertClaudeMcp(options: HostOperationOptions, claudeDir: string): Promise<boolean> {
  const mcpPath = path.join(claudeDir, "mcp.json");
  const data = await readJsonObject(mcpPath);
  const existingServers = data["mcpServers"];
  const mcpServers = isRecord(existingServers) ? existingServers : {};
  mcpServers["lexa"] = mcpServerEntry(options);
  data["mcpServers"] = mcpServers;
  return writeJsonObject(mcpPath, data, Boolean(options.dryRun));
}

async function removeClaudeMcp(options: HostOperationOptions, claudeDir: string): Promise<boolean> {
  const mcpPath = path.join(claudeDir, "mcp.json");
  const data = await readJsonObject(mcpPath);
  const existingServers = data["mcpServers"];
  if (!isRecord(existingServers) || !("lexa" in existingServers)) return false;
  delete existingServers["lexa"];
  data["mcpServers"] = existingServers;
  return writeJsonObject(mcpPath, data, Boolean(options.dryRun));
}

function runExternal(command: string, args: string[]): { ok: boolean; message: string } {
  const result = spawnSync(command, args, { stdio: "pipe", encoding: "utf-8" });
  if (result.status === 0) return { ok: true, message: `${command} ${args.join(" ")}` };
  const stderr = result.stderr.trim();
  const stdout = result.stdout.trim();
  return { ok: false, message: stderr || stdout || `${command} exited ${result.status ?? "unknown"}` };
}

async function installClaude(options: HostOperationOptions): Promise<HostOperationResult> {
  const claudeDir = hostHome(options.homeDir, ".claude", "LEXA_CLAUDE_HOME");
  const pluginPath = path.join(options.adapterRoot, "claude-code");
  const commands = [
    `claude plugin install ${pluginPath}`,
    `claude mcp add lexa -- npx ${mcpArgs(options).join(" ")}`,
  ];
  const messages = ["Claude Code adapter is installed through Claude's plugin/MCP surfaces."];
  let changed = false;

  if (options.executeExternal) {
    if (!commandExists("claude")) {
      messages.push("claude CLI was not found; wrote MCP config only and left plugin command for manual execution.");
    } else if (!options.dryRun) {
      const externalCommands: [string, ...string[]][] = [
        ["claude", "plugin", "install", pluginPath],
        ["claude", "mcp", "add", "lexa", "--", "npx", ...mcpArgs(options)],
      ];
      for (const [command, ...args] of externalCommands) {
        const result = runExternal(command, args);
        messages.push(result.ok ? `Executed: ${result.message}` : `External command failed: ${result.message}`);
        changed = changed || result.ok;
      }
    }
  }

  const mcpChanged = await upsertClaudeMcp(options, claudeDir);
  changed = changed || mcpChanged;

  return {
    runtime: "claude",
    action: "install",
    changed: changed && !options.dryRun,
    skipped: false,
    paths: [path.join(claudeDir, "mcp.json"), pluginPath],
    commands,
    messages,
  };
}

async function uninstallClaude(options: HostOperationOptions): Promise<HostOperationResult> {
  const claudeDir = hostHome(options.homeDir, ".claude", "LEXA_CLAUDE_HOME");
  const commands = ["claude mcp remove lexa", "claude plugin uninstall lexa"];
  const messages = ["Claude Code uninstall removes the Lexa MCP entry and, when requested, asks Claude CLI to uninstall the plugin."];
  let changed = await removeClaudeMcp(options, claudeDir);

  if (options.executeExternal && commandExists("claude") && !options.dryRun) {
    const externalCommands: [string, ...string[]][] = [
      ["claude", "mcp", "remove", "lexa"],
      ["claude", "plugin", "uninstall", "lexa"],
    ];
    for (const [command, ...args] of externalCommands) {
      const result = runExternal(command, args);
      messages.push(result.ok ? `Executed: ${result.message}` : `External command failed: ${result.message}`);
      changed = changed || result.ok;
    }
  }

  return {
    runtime: "claude",
    action: "uninstall",
    changed: changed && !options.dryRun,
    skipped: false,
    paths: [path.join(claudeDir, "mcp.json")],
    commands,
    messages,
  };
}

function codexManagedBlock(options: HostOperationOptions): string {
  const args = mcpArgs(options).map(jsonString).join(", ");
  return [
    MANAGED_CODEX_START,
    "# Lexa MCP hookup for Codex CLI. Managed by `lxa install/uninstall`.",
    "# Codex-native rules live in ~/.codex/rules/lexa.md; skills live in ~/.codex/skills/lexa-*.",
    "[mcp_servers.lexa]",
    'command = "npx"',
    `args = [${args}]`,
    "",
    "[mcp_servers.lexa.env]",
    'LEXA_AGENT_RUNTIME = "codex"',
    MANAGED_CODEX_END,
    "",
  ].join("\n");
}

function isCodexLexaTable(line: string): boolean {
  return line === "[mcp_servers.lexa]" || line.startsWith("[mcp_servers.lexa.");
}

function removeManagedCodexBlock(content: string): { content: string; removed: boolean } {
  const markerPattern = new RegExp(`\\n?${MANAGED_CODEX_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${MANAGED_CODEX_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`, "g");
  const withoutMarkers = content.replace(markerPattern, "\n");
  const markerRemoved = withoutMarkers !== content;
  const lines = withoutMarkers.split(/\r?\n/);
  const output: string[] = [];
  let removedLegacy = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (isCodexLexaTable(trimmed)) {
      removedLegacy = true;
      i++;
      while (i < lines.length) {
        const next = (lines[i] ?? "").trim();
        const isTable = /^\[[^\]]+\]$/.test(next);
        if (isTable && !isCodexLexaTable(next)) {
          i--;
          break;
        }
        i++;
      }
      continue;
    }
    if (line.includes("Lexa MCP hookup for Codex CLI")) {
      removedLegacy = true;
      continue;
    }
    output.push(line);
  }
  return { content: output.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n", removed: markerRemoved || removedLegacy };
}

async function installCodexNativeArtifacts(codexDir: string, options: HostOperationOptions): Promise<string[]> {
  const paths: string[] = [];
  const rulesSource = path.join(options.adapterRoot, "codex", "rules", CODEX_RULE_FILENAME);
  const rulesTarget = path.join(codexDir, "rules", CODEX_RULE_FILENAME);
  const skillsSource = path.join(options.adapterRoot, "codex", "skills");
  const skillsTargetRoot = path.join(codexDir, "skills");

  if (!options.dryRun) {
    await mkdir(path.dirname(rulesTarget), { recursive: true });
    await cp(rulesSource, rulesTarget);
    await mkdir(skillsTargetRoot, { recursive: true });
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(skillsSource, { withFileTypes: true });
    const desired = new Set(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const target = path.join(skillsTargetRoot, entry.name);
      if (!entry.name.startsWith(CODEX_SKILL_PREFIX)) {
        throw new Error(`Codex skill directory must be namespaced ${CODEX_SKILL_PREFIX}*: ${entry.name}`);
      }
      await replaceDirectory(path.join(skillsSource, entry.name), target, false);
      paths.push(target);
    }
    const installed = await readdir(skillsTargetRoot, { withFileTypes: true });
    for (const entry of installed) {
      if (entry.isDirectory() && entry.name.startsWith(CODEX_SKILL_PREFIX) && !desired.has(entry.name)) {
        await rm(path.join(skillsTargetRoot, entry.name), { recursive: true, force: true });
      }
    }
  } else {
    paths.push(path.join(skillsTargetRoot, `${CODEX_SKILL_PREFIX}setup`));
  }
  return [rulesTarget, ...paths];
}

async function installCodex(options: HostOperationOptions): Promise<HostOperationResult> {
  const codexDir = hostHome(options.homeDir, ".codex", "LEXA_CODEX_HOME");
  const pluginSource = path.join(options.adapterRoot, "codex");
  const pluginTarget = path.join(codexDir, "plugins", "lexa");
  const configPath = path.join(codexDir, "config.toml");
  const original = existsSync(configPath) ? await readFile(configPath, "utf-8") : "";
  const stripped = removeManagedCodexBlock(original).content;
  const next = `${stripped.trimEnd()}\n\n${codexManagedBlock(options)}`;
  let nativePaths: string[] = [];
  if (!options.dryRun) {
    await mkdir(path.dirname(configPath), { recursive: true });
    await writeFile(configPath, next, "utf-8");
    await replaceDirectory(pluginSource, pluginTarget, false);
    nativePaths = await installCodexNativeArtifacts(codexDir, options);
  } else {
    nativePaths = [
      path.join(codexDir, "rules", CODEX_RULE_FILENAME),
      path.join(codexDir, "skills", `${CODEX_SKILL_PREFIX}setup`),
    ];
  }
  return {
    runtime: "codex",
    action: "install",
    changed: !options.dryRun,
    skipped: false,
    paths: [configPath, pluginTarget, ...nativePaths],
    commands: [`Codex MCP config: ${configPath}`],
    messages: ["Installed Codex-native Lexa rules, namespaced skills, plugin assets, and managed MCP/env config."],
  };
}

async function uninstallCodex(options: HostOperationOptions): Promise<HostOperationResult> {
  const codexDir = hostHome(options.homeDir, ".codex", "LEXA_CODEX_HOME");
  const pluginTarget = path.join(codexDir, "plugins", "lexa");
  const configPath = path.join(codexDir, "config.toml");
  const ruleTarget = path.join(codexDir, "rules", CODEX_RULE_FILENAME);
  const skillsRoot = path.join(codexDir, "skills");
  let changed = false;
  if (existsSync(configPath)) {
    const original = await readFile(configPath, "utf-8");
    const removed = removeManagedCodexBlock(original);
    changed = removed.removed;
    if (removed.removed && !options.dryRun) await writeFile(configPath, removed.content, "utf-8");
  }
  for (const target of [pluginTarget, ruleTarget]) {
    if (existsSync(target)) {
      changed = true;
      if (!options.dryRun) await rm(target, { recursive: true, force: true });
    }
  }
  if (existsSync(skillsRoot)) {
    const { readdir } = await import("node:fs/promises");
    for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith(CODEX_SKILL_PREFIX)) {
        changed = true;
        if (!options.dryRun) await rm(path.join(skillsRoot, entry.name), { recursive: true, force: true });
      }
    }
  }
  return {
    runtime: "codex",
    action: "uninstall",
    changed: changed && !options.dryRun,
    skipped: !changed,
    paths: [configPath, pluginTarget, ruleTarget, path.join(skillsRoot, `${CODEX_SKILL_PREFIX}*`)],
    commands: [],
    messages: ["Removed Codex managed MCP block, Lexa rule, namespaced Lexa skills, and plugin assets."],
  };
}

async function upsertHermesMcp(options: HostOperationOptions, hermesConfig: string): Promise<boolean> {
  const data = await readYamlObject(hermesConfig);
  const rawServers = data["mcp_servers"];
  const servers = isRecord(rawServers) ? rawServers : {};
  servers["lexa"] = { ...mcpServerEntry(options), enabled: true };
  data["mcp_servers"] = servers;
  return writeYamlObject(hermesConfig, data, Boolean(options.dryRun));
}

async function removeHermesMcp(options: HostOperationOptions, hermesConfig: string): Promise<boolean> {
  const data = await readYamlObject(hermesConfig);
  const rawServers = data["mcp_servers"];
  if (!isRecord(rawServers) || !("lexa" in rawServers)) return false;
  delete rawServers["lexa"];
  data["mcp_servers"] = rawServers;
  return writeYamlObject(hermesConfig, data, Boolean(options.dryRun));
}

async function installHermes(options: HostOperationOptions): Promise<HostOperationResult> {
  const hermesDir = hostHome(options.homeDir, ".hermes", "LEXA_HERMES_HOME");
  const pluginSource = path.join(options.adapterRoot, "hermes");
  const legacyPluginTarget = path.join(hermesDir, "plugins", "lexa");
  const legacyMcpPath = path.join(hermesDir, "mcp", "lexa.json");
  const skillSource = path.join(options.adapterRoot, "hermes", "skills");
  const skillTarget = path.join(hermesDir, "skills", HERMES_SKILL_CATEGORY, HERMES_SKILL_NAME);
  const configPath = path.join(hermesDir, "config.yaml");
  const adapterTarget = path.join(hermesDir, "adapters", "lexa");
  if (!options.dryRun) {
    await rm(legacyPluginTarget, { recursive: true, force: true });
    await rm(legacyMcpPath, { force: true });
    await replaceDirectory(pluginSource, adapterTarget, false);
    await replaceDirectory(skillSource, skillTarget, false);
    await upsertHermesMcp(options, configPath);
  }
  return {
    runtime: "hermes",
    action: "install",
    changed: !options.dryRun,
    skipped: false,
    paths: [adapterTarget, skillTarget, configPath],
    commands: [`Hermes MCP config: ${configPath}`],
    messages: ["Installed Hermes-native Lexa skill bundle and registered mcp_servers.lexa in ~/.hermes/config.yaml."],
  };
}

async function uninstallHermes(options: HostOperationOptions): Promise<HostOperationResult> {
  const hermesDir = hostHome(options.homeDir, ".hermes", "LEXA_HERMES_HOME");
  const adapterTarget = path.join(hermesDir, "adapters", "lexa");
  const skillTarget = path.join(hermesDir, "skills", HERMES_SKILL_CATEGORY, HERMES_SKILL_NAME);
  const legacyPluginTarget = path.join(hermesDir, "plugins", "lexa");
  const legacyMcpPath = path.join(hermesDir, "mcp", "lexa.json");
  const configPath = path.join(hermesDir, "config.yaml");
  let changed = false;
  if (existsSync(configPath)) changed = (await removeHermesMcp(options, configPath)) || changed;
  for (const target of [adapterTarget, skillTarget, legacyPluginTarget, legacyMcpPath]) {
    if (existsSync(target)) {
      changed = true;
      if (!options.dryRun) await rm(target, { recursive: true, force: true });
    }
  }
  return {
    runtime: "hermes",
    action: "uninstall",
    changed: changed && !options.dryRun,
    skipped: !changed,
    paths: [adapterTarget, skillTarget, configPath],
    commands: [],
    messages: ["Removed Hermes Lexa skill bundle, adapter copy, legacy descriptor files, and mcp_servers.lexa."],
  };
}

export async function runHostOperation(options: HostOperationOptions): Promise<HostOperationResult[]> {
  const runtimes = resolveRuntimeSelection(options.runtime);
  const results: HostOperationResult[] = [];
  for (const runtime of runtimes) {
    if (options.action === "install") {
      if (runtime === "claude") results.push(await installClaude(options));
      if (runtime === "codex") results.push(await installCodex(options));
      if (runtime === "hermes") results.push(await installHermes(options));
    } else {
      if (runtime === "claude") results.push(await uninstallClaude(options));
      if (runtime === "codex") results.push(await uninstallCodex(options));
      if (runtime === "hermes") results.push(await uninstallHermes(options));
    }
  }
  return results;
}

export function formatHostOperationResults(results: HostOperationResult[], dryRun: boolean): string {
  const lines: string[] = [];
  lines.push(dryRun ? "Lexa host operation plan (dry-run)." : "Lexa host operation complete.");
  for (const result of results) {
    lines.push(`- ${result.runtime} ${result.action}: ${result.skipped ? "skipped" : result.changed || dryRun ? "ok" : "no changes"}`);
    for (const message of result.messages) lines.push(`  ${message}`);
    for (const filePath of result.paths) lines.push(`  path: ${filePath}`);
    for (const command of result.commands) lines.push(`  command: ${command}`);
  }
  return lines.join("\n");
}
