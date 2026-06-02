import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { runHostOperation, formatHostOperationResults } from "./hosts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const adapterRoot = path.join(repoRoot, "adapters");

describe("host installer/uninstaller", () => {
  it("installs and uninstalls Codex managed MCP config without removing unrelated sections", async () => {
    const home = await mkdtemp(path.join(tmpdir(), "oms-install-codex-"));
    const codexDir = path.join(home, ".codex");
    await writeFile(path.join(codexDir, "config.toml"), 'model = "gpt-5"\n\n[other]\nfoo = 1\n', { encoding: "utf-8" }).catch(async () => {
      await import("node:fs/promises").then(({ mkdir }) => mkdir(codexDir, { recursive: true }));
      await writeFile(path.join(codexDir, "config.toml"), 'model = "gpt-5"\n\n[other]\nfoo = 1\n', "utf-8");
    });

    await runHostOperation({ action: "install", runtime: "codex", vault: "/tmp/Vault", homeDir: home, adapterRoot });
    const installed = await readFile(path.join(codexDir, "config.toml"), "utf-8");
    expect(installed).toContain("# BEGIN OMS MANAGED MCP");
    expect(installed).toContain("[mcp_servers.oms]");
    expect(installed).toContain("oms-v0.1.4/oms-0.1.4.tgz");
    expect(installed).toContain("[other]");
    expect(existsSync(path.join(codexDir, "plugins", "oms", "AGENTS.md"))).toBe(true);
    expect(existsSync(path.join(codexDir, "rules", "oms.md"))).toBe(true);
    expect(existsSync(path.join(codexDir, "skills", "oms-capture", "SKILL.md"))).toBe(true);

    await runHostOperation({ action: "uninstall", runtime: "codex", vault: "/tmp/Vault", homeDir: home, adapterRoot });
    const uninstalled = await readFile(path.join(codexDir, "config.toml"), "utf-8");
    expect(uninstalled).not.toContain("mcp_servers.oms");
    expect(uninstalled).toContain("[other]");
    expect(existsSync(path.join(codexDir, "plugins", "oms"))).toBe(false);
    expect(existsSync(path.join(codexDir, "rules", "oms.md"))).toBe(false);
    expect(existsSync(path.join(codexDir, "skills", "oms-capture"))).toBe(false);
  });

  it("installs and uninstalls Hermes native skill bundle and MCP config", async () => {
    const home = await mkdtemp(path.join(tmpdir(), "oms-install-hermes-"));
    await runHostOperation({ action: "install", runtime: "hermes", vault: "/tmp/Vault", homeDir: home, adapterRoot });
    const config = await readFile(path.join(home, ".hermes", "config.yaml"), "utf-8");
    expect(config).toContain("oms:");
    expect(config).toContain("command: npx");
    expect(existsSync(path.join(home, ".hermes", "skills", "knowledge-management", "oms", "capture", "SKILL.md"))).toBe(true);
    expect(existsSync(path.join(home, ".hermes", "adapters", "oms", "SOUL.md"))).toBe(true);

    await runHostOperation({ action: "uninstall", runtime: "hermes", vault: "/tmp/Vault", homeDir: home, adapterRoot });
    const after = await readFile(path.join(home, ".hermes", "config.yaml"), "utf-8");
    expect(after).not.toContain("oms:");
    expect(existsSync(path.join(home, ".hermes", "skills", "knowledge-management", "oms"))).toBe(false);
    expect(existsSync(path.join(home, ".hermes", "adapters", "oms"))).toBe(false);
  });

  it("dry-run reports all host plans without mutating home", async () => {
    const home = await mkdtemp(path.join(tmpdir(), "oms-install-dry-"));
    const results = await runHostOperation({ action: "install", runtime: "all", vault: "/tmp/Vault", homeDir: home, adapterRoot, dryRun: true });
    expect(results.map((result) => result.runtime)).toEqual(["claude", "codex", "hermes"]);
    expect(formatHostOperationResults(results, true)).toContain("dry-run");
    expect(existsSync(path.join(home, ".codex"))).toBe(false);
    expect(existsSync(path.join(home, ".hermes"))).toBe(false);
  });
});
