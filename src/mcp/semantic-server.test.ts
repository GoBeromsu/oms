import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../");
const distCli = path.join(repoRoot, "dist", "cli", "oms.js");

function textPayload(result: Awaited<ReturnType<Client["callTool"]>>): Record<string, unknown> {
  const block = result.content[0];
  expect(block?.type).toBe("text");
  return JSON.parse(block.type === "text" ? block.text : "{}") as Record<string, unknown>;
}

describe("Oh My Second Brain MCP semantic stdio server", () => {
  it("runs typed semantic search and document rehydration through read-only MCP tools", async () => {
    const tmpVault = await mkdtemp(path.join(tmpdir(), "oms-mcp-semantic-"));
    await mkdir(path.join(tmpVault, "references"), { recursive: true });
    await writeFile(
      path.join(tmpVault, "references", "Agent Retrieval.md"),
      `---
title: Agent Retrieval
tags:
  - agent-graph
---
Agent retrieval follows [[Graph Index]] and preserves semantic evidence through OMS retrieve.
`,
      "utf-8",
    );
    await writeFile(
      path.join(tmpVault, "references", "Graph Index.md"),
      `---
title: Graph Index
tags:
  - agent-graph
---
Index note for graph neighborhoods and semantic lookup.
`,
      "utf-8",
    );

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [distCli, "mcp", "--vault", tmpVault],
      cwd: repoRoot,
      stderr: "pipe",
    });
    const client = new Client({ name: "oms-test-client", version: "0.0.0" });

    try {
      await client.connect(transport);
      const retrieve = textPayload(
        await client.callTool({
          name: "oms_retrieve_context",
          arguments: {
            property: "tags",
            value: "agent-graph",
            query: "fallback retrieve query",
            limit: 1,
            maxNeighbors: 5,
            useCache: false,
            semanticEnabled: true,
            semanticCollection: "obsidian",
            semanticLimit: 3,
            semanticMode: "query",
            semanticIntent: "route semantic evidence through oms retrieve",
            semanticLex: "exact semantic retrieval affordances",
            semanticVec: "semantic notes about retrieval integration",
            semanticHyde: "A note explaining how OMS semantic search is available from retrieve.",
            semanticMinScore: 0.01,
            embeddingSyncBeforeSearch: true,
            embeddingSyncForce: true,
          },
        }),
      );
      const semanticHits = retrieve.semanticHits as Array<Record<string, unknown>>;
      expect(semanticHits[0]).toEqual(expect.objectContaining({ path: "references/Agent Retrieval.md" }));
      const docid = semanticHits[0]?.docid;
      if (typeof docid !== "string") throw new Error("Expected native semantic docid.");

      const sync = textPayload(
        await client.callTool({
          name: "oms_sync_embeddings",
          arguments: { collection: "obsidian", ensureCollection: true, force: true, index: "brain" },
        }),
      );
      expect(sync).toEqual(expect.objectContaining({ available: true, index: path.join(tmpVault, "brain") }));

      const directQuery = textPayload(
        await client.callTool({
          name: "oms_semantic_query",
          arguments: { query: "intent: qmd compatible MCP search\nlex: agent retr", collection: "obsidian", limit: 1 },
        }),
      );
      expect((directQuery.hits as Array<Record<string, unknown>>)[0]).toEqual(
        expect.objectContaining({ path: "references/Agent Retrieval.md" }),
      );

      const templates = await client.listResourceTemplates();
      expect(templates.resourceTemplates).toEqual([expect.objectContaining({ uriTemplate: "qmd://{path}" })]);
      const resource = await client.readResource({ uri: "qmd://references/Agent%20Retrieval.md" });
      expect(resource.contents[0]).toEqual(
        expect.objectContaining({
          uri: "qmd://references/Agent%20Retrieval.md",
          mimeType: "text/markdown",
          text: expect.stringContaining("Agent retrieval follows"),
        }),
      );

      const single = textPayload(
        await client.callTool({
          name: "oms_get_document",
          arguments: { target: `${docid}:1:20`, collection: "obsidian", fullPath: true },
        }),
      );
      const batch = textPayload(
        await client.callTool({
          name: "oms_multi_get_documents",
          arguments: { targets: ["references/*.md", docid], lineLimit: 40, maxBytes: 2048 },
        }),
      );
      expect((single.documents as Array<Record<string, unknown>>)[0]).toEqual(
        expect.objectContaining({ path: path.join(tmpVault, "references", "Agent Retrieval.md") }),
      );
      expect((batch.documents as Array<Record<string, unknown>>).map((doc) => doc.path)).toEqual([
        "references/Agent Retrieval.md",
        "references/Graph Index.md",
      ]);
    } finally {
      await client.close();
      await rm(tmpVault, { recursive: true, force: true });
    }
  });
});
