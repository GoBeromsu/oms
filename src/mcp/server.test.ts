import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../");
const fixtureVault = path.join(repoRoot, "test", "fixtures", "vault");
const distCli = path.join(repoRoot, "dist", "cli", "lexa.js");

function textPayload(result: Awaited<ReturnType<Client["callTool"]>>): Record<string, unknown> {
  const block = result.content[0];
  expect(block?.type).toBe("text");
  return JSON.parse(block.type === "text" ? block.text : "{}") as Record<string, unknown>;
}

describe("Lexa MCP stdio server", () => {
  it("exposes read/status tools and validates a fixture note", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [distCli, "mcp", "--vault", fixtureVault],
      cwd: repoRoot,
      stderr: "pipe",
    });
    const client = new Client({ name: "lexa-test-client", version: "0.0.0" });

    try {
      await client.connect(transport);

      const tools = await client.listTools();
      const names = tools.tools.map((tool) => tool.name);
      expect(names).toEqual([
        "lexa_graph_status",
        "lexa_graph_build",
        "lexa_list_concepts",
        "lexa_retrieve_by_axis",
        "lexa_lazy_load_note",
        "lexa_validate_contract",
        "lexa_capture_prepare",
        "lexa_capture_commit",
      ]);
      const commitTool = tools.tools.find((tool) => tool.name === "lexa_capture_commit");
      expect(commitTool?.annotations?.readOnlyHint).toBe(false);
      expect(commitTool?.annotations?.destructiveHint).toBe(false);

      const status = await client.callTool({ name: "lexa_graph_status", arguments: {} });
      const parsedStatus = textPayload(status);
      expect(parsedStatus.writeTools).toBe(
        "capture-commit-gated-by-vault-confinement-and-contract-validation",
      );
      expect(parsedStatus.counts.concepts).toBeGreaterThan(0);
      const derivedState = parsedStatus.derivedState as Record<string, unknown>;
      const staleness = derivedState.staleness as Record<string, unknown>;
      expect(staleness.graphStale).toBe(true);

      const validation = await client.callTool({
        name: "lexa_validate_contract",
        arguments: { notePath: "references/clean-architecture.md" },
      });
      const parsedValidation = textPayload(validation);
      expect(parsedValidation.valid).toBe(true);
      expect(parsedValidation.concept).toBe("literature");
    } finally {
      await client.close();
    }
  });

  it("reports invalid local .lexa instead of falling back to bundled defaults", async () => {
    const tmpVault = await mkdtemp(path.join(tmpdir(), "lexa-invalid-"));
    await mkdir(path.join(tmpVault, ".lexa", "concepts"), { recursive: true });
    await writeFile(path.join(tmpVault, ".lexa", "taxonomy.yaml"), "not: [valid", "utf-8");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [distCli, "mcp", "--vault", tmpVault],
      cwd: repoRoot,
      stderr: "pipe",
    });
    const client = new Client({ name: "lexa-test-client", version: "0.0.0" });

    try {
      await client.connect(transport);

      const status = textPayload(await client.callTool({ name: "lexa_graph_status", arguments: {} }));
      expect(status.ontologySource).toBe("vault-invalid");
      expect(status.writeTools).toBe("disabled-invalid-ontology");

      const commit = await client.callTool({
        name: "lexa_capture_commit",
        arguments: {
          notePath: "references/unsafe.md",
          frontmatter: {
            title: "Should not write",
            "source-url": "https://example.com/should-not-write",
          },
          body: "Should not write.",
          mode: "create",
        },
      });
      expect(commit.isError).toBe(true);
      expect(commit.content[0]?.type === "text" ? commit.content[0].text : "").toContain(
        "Lexa MCP error",
      );
    } finally {
      await client.close();
      await rm(tmpVault, { recursive: true, force: true });
    }
  });

  it("does not treat cache-only .lexa as a broken local ontology", async () => {
    const tmpVault = await mkdtemp(path.join(tmpdir(), "lexa-cache-only-"));
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [distCli, "mcp", "--vault", tmpVault],
      cwd: repoRoot,
      stderr: "pipe",
    });
    const client = new Client({ name: "lexa-test-client", version: "0.0.0" });

    try {
      await client.connect(transport);
      expect(textPayload(await client.callTool({ name: "lexa_graph_status", arguments: {} })).ontologySource).toBe(
        "bundled",
      );

      await client.callTool({ name: "lexa_graph_build", arguments: {} });

      expect(textPayload(await client.callTool({ name: "lexa_graph_status", arguments: {} })).ontologySource).toBe(
        "bundled",
      );
    } finally {
      await client.close();
      await rm(tmpVault, { recursive: true, force: true });
    }
  });

  it("treats a non-directory .lexa path as invalid instead of using bundled defaults", async () => {
    const tmpVault = await mkdtemp(path.join(tmpdir(), "lexa-file-"));
    await writeFile(path.join(tmpVault, ".lexa"), "not a directory", "utf-8");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [distCli, "mcp", "--vault", tmpVault],
      cwd: repoRoot,
      stderr: "pipe",
    });
    const client = new Client({ name: "lexa-test-client", version: "0.0.0" });

    try {
      await client.connect(transport);

      const status = textPayload(await client.callTool({ name: "lexa_graph_status", arguments: {} }));
      expect(status.ontologySource).toBe("vault-invalid");
      expect(status.writeTools).toBe("disabled-invalid-ontology");

      const commit = await client.callTool({
        name: "lexa_capture_commit",
        arguments: {
          notePath: "references/unsafe.md",
          frontmatter: {
            title: "Should not write",
            "source-url": "https://example.com/should-not-write",
          },
          body: "Should not write.",
          mode: "create",
        },
      });
      expect(commit.isError).toBe(true);
    } finally {
      await client.close();
      await rm(tmpVault, { recursive: true, force: true });
    }
  });
});
