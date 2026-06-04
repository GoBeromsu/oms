import { describe, expect, it } from "vitest";
import {
  createNodeQmdRunner,
  queryQmd,
  readQmdStatus,
  type QmdCommandRunner,
} from "./qmd.js";

function runnerWith(result: { readonly status: number; readonly stdout: string; readonly stderr?: string }): QmdCommandRunner {
  return {
    run: async () => ({
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr ?? "",
    }),
  };
}

describe("qmd provider", () => {
  it("parses installed provider status and model URLs", async () => {
    const status = await readQmdStatus({
      runner: runnerWith({
        status: 0,
        stdout: `QMD Status

Models
  Embedding:   https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF
  Reranking:   https://huggingface.co/ggml-org/Qwen3-Reranker-0.6B-Q8_0-GGUF
  Generation:  https://huggingface.co/tobil/qmd-query-expansion-1.7B-gguf
`,
      }),
    });

    expect(status).toEqual({
      available: true,
      models: {
        embedding: "https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF",
        reranking: "https://huggingface.co/ggml-org/Qwen3-Reranker-0.6B-Q8_0-GGUF",
        generation: "https://huggingface.co/tobil/qmd-query-expansion-1.7B-gguf",
      },
    });
  });

  it("returns unavailable status instead of throwing when qmd is absent", async () => {
    const status = await readQmdStatus({
      runner: runnerWith({
        status: 127,
        stdout: "",
        stderr: "qmd: command not found",
      }),
    });

    expect(status).toEqual({
      available: false,
      reason: "qmd: command not found",
    });
  });

  it("parses query hits with lexical and vector evidence", async () => {
    const result = await queryQmd({
      query: "agent vault memory governance",
      collection: "obsidian",
      limit: 2,
      runner: runnerWith({
        status: 0,
        stdout: JSON.stringify([
          {
            docid: "#abc123",
            score: 0.89,
            file: "qmd://obsidian/15-Work/Agent Vault.md",
            line: 12,
            title: "Agent Vault",
            snippet: "Agents vault as memory governance.",
            explain: {
              ftsScores: [0.94],
              vectorScores: [0.61],
            },
          },
        ]),
      }),
    });

    expect(result).toEqual({
      available: true,
      hits: [
        {
          docid: "#abc123",
          score: 0.89,
          uri: "qmd://obsidian/15-Work/Agent Vault.md",
          path: "15-Work/Agent Vault.md",
          line: 12,
          title: "Agent Vault",
          snippet: "Agents vault as memory governance.",
          evidence: {
            lexical: true,
            vector: true,
          },
        },
      ],
    });
  });

  it("returns unavailable instead of throwing when qmd prints invalid JSON", async () => {
    const result = await queryQmd({
      query: "agent vault memory governance",
      runner: runnerWith({
        status: 0,
        stdout: "warming models...\nnot json",
      }),
    });

    expect(result).toEqual({
      available: false,
      reason: expect.stringContaining("Unable to parse qmd JSON"),
      hits: [],
    });
  });

  it("times out a hung qmd subprocess", async () => {
    const runner = createNodeQmdRunner({
      command: process.execPath,
      timeoutMs: 10,
    });

    const result = await runner.run(["-e", "setTimeout(() => {}, 5000)"]);

    expect(result.status).toBe(124);
    expect(result.stderr).toContain("timed out");
  });
});
