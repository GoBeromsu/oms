import { describe, it, expect, afterAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm, cp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { parse as yamlParse } from "yaml";
import { buildClaudeInstallPlan, runSetup, runDoctor } from "./cli/oms.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../");
const fixtureVault = path.join(repoRoot, "test", "fixtures", "vault");

let tmpVault: string;

afterAll(async () => {
  if (tmpVault) {
    await rm(tmpVault, { recursive: true, force: true });
  }
});

describe("runSetup --yes E2E", () => {
  it("creates .oms/taxonomy.yaml with version:0 and a 'references' folder binding", async () => {
    // Create a fresh temp dir and copy the fixture vault into it.
    tmpVault = await mkdtemp(path.join(tmpdir(), "oms-test-"));
    // Copy references/ and notes/ from the fixture vault.
    await cp(fixtureVault, tmpVault, { recursive: true });

    // Run setup in non-interactive mode.
    await expect(runSetup({ vault: tmpVault, yes: true })).resolves.toBeUndefined();

    // Read the written taxonomy.yaml.
    const taxonomyPath = path.join(tmpVault, ".oms", "taxonomy.yaml");
    const raw = await readFile(taxonomyPath, "utf-8");
    const parsed = yamlParse(raw) as Record<string, unknown>;

    expect(parsed["version"]).toBe(0);

    const folders = parsed["folders"] as Record<string, unknown>;
    expect(folders).toBeDefined();
    expect(folders).toHaveProperty("references");

    // The vault-local ontology must be loadable by doctor: setup writes
    // `.oms/concepts/` (mirroring core/ontology/), so the shipped concepts
    // are copied alongside taxonomy.yaml.
    const literatureCopy = path.join(tmpVault, ".oms", "concepts", "literature.yaml");
    await expect(readFile(literatureCopy, "utf-8")).resolves.toContain("concept: literature");
  });

  it("doctor runs against the freshly set-up vault and exits 0", async () => {
    // Regression guard: setup's vault-local layout (.oms/taxonomy.yaml +
    // .oms/concepts/) must be exactly what doctor's loadOntology consumes.
    const code = await runDoctor({ vault: tmpVault });
    expect(code).toBe(0);
  });

  it("builds a Claude Code install plan that only claims the read/status MCP runtime", () => {
    const plan = buildClaudeInstallPlan({ vault: "/tmp/My Vault" });

    expect(plan.pluginPath).toContain("adapters/claude-code");
    expect(plan.pluginInstallCommand).toContain("claude plugin install");
    expect(plan.mcpRegistrationCommand).toBe(
      "claude mcp add oms -- npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz mcp --vault '/tmp/My Vault'",
    );
    expect(plan.mcpRuntimeStatus).toBe("read-status-runtime");
  });
});
