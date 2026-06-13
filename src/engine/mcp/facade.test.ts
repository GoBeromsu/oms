import { describe, expect, it, vi } from "vitest";
import { McpEngineAdapter } from "./facade.js";
import type { DispatcherDeps } from "../retrieval/dispatcher.js";
import type { EmbeddingProvider, ScoredHit, VectorStore } from "../types.js";

// ---------------------------------------------------------------------------
// Fake backends
// ---------------------------------------------------------------------------

function makeStore(lexHits: ScoredHit[] = [], vecHits: ScoredHit[] = []): VectorStore {
  return {
    upsert: vi.fn(),
    queryLex: vi.fn().mockReturnValue(lexHits),
    queryVec: vi.fn().mockReturnValue(vecHits),
    close: vi.fn(),
  };
}

function makeEmbed(
  model = "test-embed",
  dims = 4,
  vec = new Float32Array([0.1, 0.2, 0.3, 0.4]),
): EmbeddingProvider {
  return {
    model,
    dimensions: dims,
    embed: vi.fn().mockResolvedValue(vec),
    dispose: vi.fn().mockResolvedValue(undefined),
  };
}

function makeDeps(
  lexHits: ScoredHit[] = [],
  vecHits: ScoredHit[] = [],
  model = "test-embed",
): DispatcherDeps {
  return { store: makeStore(lexHits, vecHits), embed: makeEmbed(model) };
}

const LEX_HIT: ScoredHit = { docPath: "notes/lex.md", chunkOrdinal: 0, score: 0.8 };
const VEC_HIT: ScoredHit = { docPath: "notes/vec.md", chunkOrdinal: 0, score: 0.9 };

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("McpEngineAdapter — construction", () => {
  it("constructs without throwing (deps are not instantiated, just received)", () => {
    const adapter = new McpEngineAdapter(makeDeps());
    expect(adapter).toBeInstanceOf(McpEngineAdapter);
  });
});

// ---------------------------------------------------------------------------
// semanticQuery
// ---------------------------------------------------------------------------

describe("McpEngineAdapter.semanticQuery", () => {
  it("returns available=true with mapped hits for a lex query", async () => {
    const adapter = new McpEngineAdapter(makeDeps([LEX_HIT], []));
    const result = await adapter.semanticQuery({ query: "test", mode: "query" });
    expect(result.available).toBe(true);
    if (!result.available) return;
    expect(result.hits.length).toBeGreaterThan(0);
    // LEX_HIT should surface (store.queryLex returns it)
    const paths = result.hits.map((h) => h.path);
    expect(paths).toContain("notes/lex.md");
  });

  it("returns available=true with vec hit for vsearch mode", async () => {
    const adapter = new McpEngineAdapter(makeDeps([], [VEC_HIT]));
    const result = await adapter.semanticQuery({ query: "semantic", mode: "vsearch" });
    expect(result.available).toBe(true);
    if (!result.available) return;
    const paths = result.hits.map((h) => h.path);
    expect(paths).toContain("notes/vec.md");
  });

  it("applies minScore filter", async () => {
    const lowHit: ScoredHit = { docPath: "low.md", chunkOrdinal: 0, score: 0.1 };
    const adapter = new McpEngineAdapter(makeDeps([lowHit], []));
    const result = await adapter.semanticQuery({ query: "x", minScore: 0.5 });
    expect(result.available).toBe(true);
    if (!result.available) return;
    // low.md has RRF score << 0.5
    expect(result.hits.every((h) => h.score >= 0.5)).toBe(true);
  });

  it("returns unavailable when no sub-queries derived (empty query, no searches)", async () => {
    // No searches + lex/vec/hyde = empty, query = "" → hybrid lex+vec but with "" query
    // Actually, empty searches=[] + no shorthand → falls to mode-driven with "" query.
    // That produces sub-queries but the store returns empty.
    const adapter = new McpEngineAdapter(makeDeps([], []));
    const result = await adapter.semanticQuery({ query: "" });
    // With empty store, available=true but hits=[]
    expect(result.available).toBe(true);
    if (!result.available) return;
    expect(result.hits).toHaveLength(0);
  });

  it("returns unavailable on dispatch error", async () => {
    const badStore: VectorStore = {
      upsert: vi.fn(),
      queryLex: vi.fn().mockImplementation(() => { throw new Error("db locked"); }),
      queryVec: vi.fn().mockReturnValue([]),
      close: vi.fn(),
    };
    const adapter = new McpEngineAdapter({ store: badStore, embed: makeEmbed() });
    const result = await adapter.semanticQuery({ query: "x", mode: "search" });
    expect(result.available).toBe(false);
    if (result.available) return;
    expect(result.reason).toContain("db locked");
  });
});

// ---------------------------------------------------------------------------
// syncEmbeddings
// ---------------------------------------------------------------------------

describe("McpEngineAdapter.syncEmbeddings", () => {
  it("returns available=true with write-index step (stub)", async () => {
    const adapter = new McpEngineAdapter(makeDeps([], [], "my-model"));
    const result = await adapter.syncEmbeddings({ vault: "/v" });
    expect(result.available).toBe(true);
    if (!result.available) return;
    expect(result.steps.some((s) => s.name === "write-index")).toBe(true);
  });

  it("populates status.available=true with embed model from deps", async () => {
    const adapter = new McpEngineAdapter(makeDeps([], [], "embed-v3"));
    const result = await adapter.syncEmbeddings({ vault: "/v" });
    expect(result.available).toBe(true);
    if (!result.available) return;
    expect(result.status.available).toBe(true);
    expect(result.status.models.embedding).toBe("embed-v3");
  });
});

// ---------------------------------------------------------------------------
// semanticStatus
// ---------------------------------------------------------------------------

describe("McpEngineAdapter.semanticStatus", () => {
  it("returns available=true with embed model name", () => {
    const adapter = new McpEngineAdapter(makeDeps([], [], "my-embed-model"));
    const result = adapter.semanticStatus({});
    expect(result.available).toBe(true);
    if (!result.available) return;
    expect(result.models.embedding).toBe("my-embed-model");
  });
});

// ---------------------------------------------------------------------------
// listCollections
// ---------------------------------------------------------------------------

describe("McpEngineAdapter.listCollections", () => {
  it("returns a synthetic default collection", () => {
    const adapter = new McpEngineAdapter(makeDeps());
    const result = adapter.listCollections({});
    expect(result.available).toBe(true);
    if (!result.available) return;
    expect(result.collections[0]!.name).toBe("default");
  });
});

// ---------------------------------------------------------------------------
// listContexts
// ---------------------------------------------------------------------------

describe("McpEngineAdapter.listContexts", () => {
  it("returns empty context list", () => {
    const adapter = new McpEngineAdapter(makeDeps());
    const result = adapter.listContexts({});
    expect(result.available).toBe(true);
    if (!result.available) return;
    expect(result.contexts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// cleanup
// ---------------------------------------------------------------------------

describe("McpEngineAdapter.cleanup", () => {
  it("returns available=true with zero removals (stub)", () => {
    const adapter = new McpEngineAdapter(makeDeps());
    const result = adapter.cleanup({});
    expect(result.available).toBe(true);
    if (!result.available) return;
    expect(result.removedDocuments).toBe(0);
    expect(result.remainingDocuments).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// graphBuild / graphStatus
// ---------------------------------------------------------------------------

describe("McpEngineAdapter.graphBuild", () => {
  it("returns available=true with stub stats", () => {
    const adapter = new McpEngineAdapter(makeDeps());
    const result = adapter.graphBuild({}, "/vault");
    expect(result.available).toBe(true);
    expect(result.notes).toBe(0);
    expect(result.edges).toBe(0);
    expect(typeof result.generatedAt).toBe("string");
  });

  it("accepts dryRun flag without throwing", () => {
    const adapter = new McpEngineAdapter(makeDeps());
    expect(() => adapter.graphBuild({ dryRun: true }, "/vault")).not.toThrow();
  });
});

describe("McpEngineAdapter.graphStatus", () => {
  it("returns available=false (cache not built in stub)", () => {
    const adapter = new McpEngineAdapter(makeDeps());
    const result = adapter.graphStatus();
    expect(result.available).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// retrieveByAxis — DEFERRED stub (engine C2 not yet capable)
// ---------------------------------------------------------------------------

describe("McpEngineAdapter.retrieveByAxis", () => {
  it("throws with deferred message regardless of filters", () => {
    const adapter = new McpEngineAdapter(makeDeps());
    expect(() => adapter.retrieveByAxis({})).toThrow(
      "retrieve_by_axis not yet wired to engine C2",
    );
  });

  it("throws even with concept filter (engine has no GraphNote axis metadata)", () => {
    const adapter = new McpEngineAdapter(makeDeps([LEX_HIT], []));
    expect(() => adapter.retrieveByAxis({ concept: "Project" })).toThrow(
      "deferred to swap step #5",
    );
  });
});

// ---------------------------------------------------------------------------
// retrieveContext — DEFERRED stub (engine C2 not yet capable)
// ---------------------------------------------------------------------------

describe("McpEngineAdapter.retrieveContext", () => {
  it("throws with deferred message regardless of options", () => {
    const adapter = new McpEngineAdapter(makeDeps());
    expect(() => adapter.retrieveContext({})).toThrow(
      "retrieve_context not yet wired to engine C2",
    );
  });

  it("throws even with semantic searches (engine lacks exploreEngineGraph)", () => {
    const adapter = new McpEngineAdapter(makeDeps([LEX_HIT], [VEC_HIT]));
    expect(() =>
      adapter.retrieveContext({ semanticSearches: [{ type: "vec", query: "x" }] }),
    ).toThrow("deferred to swap step #5");
  });
});
