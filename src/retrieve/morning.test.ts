import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadOntology } from "../ontology/loader.js";
import type { QmdCommandRunner } from "../search/qmd.js";
import { retrieveMorningContext } from "./morning.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../");
const ontologyDir = path.join(repoRoot, "core", "ontology");

let tmpVault: string | undefined;

afterEach(async () => {
  if (tmpVault) {
    await rm(tmpVault, { recursive: true, force: true });
    tmpVault = undefined;
  }
});

function qmdRunner(status: number): QmdCommandRunner {
  return {
    run: async (args) => {
      if (args[0] === "status") {
        return {
          status,
          stdout:
            status === 0
              ? "Models\n  Embedding:   https://huggingface.co/example/embed\n"
              : "",
          stderr: status === 0 ? "" : "qmd unavailable",
        };
      }
      return {
        status,
        stdout:
          status === 0
            ? JSON.stringify([
                {
                  docid: "#qmd1",
                  score: 0.77,
                  file: "qmd://obsidian/references/Agent Retrieval.md",
                  title: "Agent Retrieval",
                  snippet: "QMD semantic candidate.",
                  explain: { ftsScores: [0.5], vectorScores: [0.6] },
                },
                {
                  docid: "#qmd2",
                  score: 0.74,
                  file: "qmd://obsidian/references/Unrelated.md",
                  title: "Unrelated",
                  snippet: "QMD global candidate outside the selected graph.",
                  explain: { ftsScores: [0.4], vectorScores: [0.5] },
                },
              ])
            : "",
        stderr: status === 0 ? "" : "qmd unavailable",
      };
    },
  };
}

async function writeVaultFixture(): Promise<string> {
  const vault = await mkdtemp(path.join(tmpdir(), "oms-morning-"));
  await mkdir(path.join(vault, "references"), { recursive: true });
  await writeFile(
    path.join(vault, "references", "Agent Retrieval.md"),
    `---
title: Agent Retrieval
source-url: https://example.com/agent-retrieval
tags:
  - agent-graph
---

Agent retrieval follows [[Graph Index]].
`,
    "utf-8",
  );
  await writeFile(
    path.join(vault, "references", "Graph Index.md"),
    `---
title: Graph Index
source-url: https://example.com/graph-index
tags:
  - agent-graph
---

Index note.
`,
    "utf-8",
  );
  return vault;
}

describe("morning context retrieval", () => {
  it("combines local graph hits with qmd candidates when qmd is available", async () => {
    tmpVault = await writeVaultFixture();
    const ontology = await loadOntology(ontologyDir);

    const result = await retrieveMorningContext({
      vault: tmpVault,
      ontology,
      property: "tags",
      value: "agent-graph",
      query: "agent retrieval",
      limit: 1,
      maxNeighbors: 5,
      useCache: false,
      qmd: {
        enabled: true,
        collection: "obsidian",
        runner: qmdRunner(0),
      },
    });

    expect(result.providers.qmd.available).toBe(true);
    expect(result.graph.seeds.map((node) => node.path)).toEqual(["references/Agent Retrieval.md"]);
    expect(result.hits.map((hit) => hit.source)).toEqual(["oms-seed", "oms-neighbor", "qmd", "qmd"]);
    expect(result.hits.find((hit) => hit.source === "qmd")).toEqual(
      expect.objectContaining({
        path: "references/Agent Retrieval.md",
        evidence: expect.objectContaining({ lexical: true, vector: true }),
      }),
    );
    expect(result.qmdHits.map((hit) => hit.path)).toContain("references/Unrelated.md");
  });

  it("can restrict qmd candidates to the local graph when requested", async () => {
    tmpVault = await writeVaultFixture();
    const ontology = await loadOntology(ontologyDir);

    const result = await retrieveMorningContext({
      vault: tmpVault,
      ontology,
      property: "tags",
      value: "agent-graph",
      query: "agent retrieval",
      limit: 1,
      maxNeighbors: 5,
      useCache: false,
      qmd: {
        enabled: true,
        collection: "obsidian",
        runner: qmdRunner(0),
        scope: "graph",
      },
    });

    expect(result.hits.map((hit) => hit.source)).toEqual(["oms-seed", "oms-neighbor", "qmd"]);
    expect(result.qmdHits.map((hit) => hit.path)).not.toContain("references/Unrelated.md");
  });

  it("keeps graph results when qmd is unavailable", async () => {
    tmpVault = await writeVaultFixture();
    const ontology = await loadOntology(ontologyDir);

    const result = await retrieveMorningContext({
      vault: tmpVault,
      ontology,
      property: "tags",
      value: "agent-graph",
      query: "agent retrieval",
      limit: 1,
      useCache: false,
      qmd: {
        enabled: true,
        collection: "obsidian",
        runner: qmdRunner(127),
      },
    });

    expect(result.providers.qmd).toEqual({
      available: false,
      reason: "qmd unavailable",
    });
    expect(result.hits.map((hit) => hit.source)).toEqual(["oms-seed", "oms-neighbor"]);
  });
});
