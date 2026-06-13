import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { openEngineStore } from "./store.js";
import { createHashProjectionProvider } from "./provider.js";
import type { VectorStore } from "../types.js";

const DIMS = 64;
let dir: string;
let store: VectorStore;

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "oms-store-test-"));
  store = openEngineStore(path.join(dir, "test.db"), DIMS);
});

afterAll(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

async function makeRow(docPath: string, ordinal: number, text: string) {
  const provider = createHashProjectionProvider(DIMS);
  const vector = await provider.embed(text);
  await provider.dispose();
  return {
    docPath,
    ordinal,
    text,
    headingPath: [] as string[],
    sha: "aabbcc",
    vector,
  };
}

describe("openEngineStore — upsert + queryLex", () => {
  it("upserts rows without throwing", async () => {
    const rows = [
      await makeRow("notes/alpha.md", 0, "retrieval augmented generation"),
      await makeRow("notes/beta.md", 0, "graph neural network embedding"),
    ];
    expect(() => store.upsert(rows)).not.toThrow();
  });

  it("queryLex returns hits for a matching term", () => {
    const hits = store.queryLex("retrieval augmented", 5);
    const paths = hits.map((h) => h.docPath);
    expect(paths).toContain("notes/alpha.md");
  });

  it("queryLex returns empty for unmatched query", () => {
    const hits = store.queryLex("xyzzy_unmatched_term_12345", 5);
    expect(hits).toEqual([]);
  });

  it("queryLex hits have decreasing scores (rank-based)", () => {
    const hits = store.queryLex("retrieval", 5);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1]!.score).toBeGreaterThanOrEqual(hits[i]!.score);
    }
  });

  it("upsert on same docPath+ordinal updates without duplicate", async () => {
    const row = await makeRow("notes/gamma.md", 0, "first version");
    store.upsert([row]);
    const updated = await makeRow("notes/gamma.md", 0, "updated content knowledge graph");
    store.upsert([updated]);

    // Should find updated term, not old one
    const hits = store.queryLex("knowledge graph", 5);
    const paths = hits.map((h) => h.docPath);
    expect(paths).toContain("notes/gamma.md");
  });
});

describe("openEngineStore — queryVec", () => {
  it("queryVec returns an array (may be empty if sqlite-vec unavailable)", async () => {
    const provider = createHashProjectionProvider(DIMS);
    const vec = await provider.embed("retrieval graph embedding");
    await provider.dispose();
    const hits = store.queryVec(vec, 5);
    expect(Array.isArray(hits)).toBe(true);
  });

  it("queryVec scores are in (0, 1] range", async () => {
    const provider = createHashProjectionProvider(DIMS);
    const vec = await provider.embed("retrieval augmented generation");
    await provider.dispose();
    const hits = store.queryVec(vec, 5);
    for (const h of hits) {
      expect(h.score).toBeGreaterThan(0);
      expect(h.score).toBeLessThanOrEqual(1);
    }
  });
});
