/**
 * McpEngineAdapter — engine-side adapter facade for the 8 MCP ops.
 *
 * Receives DispatcherDeps as an INJECTED dependency; never instantiates
 * VectorStore, EmbeddingProvider, or any other backend.  Construction of
 * the real backends is the integrate-phase assemble step (a later serial
 * task coordinated with the embed-port worker's output).
 *
 * This class owns the translation between MCP op inputs/outputs and the
 * engine's TypedSubQuery[] / RetrievalResult[] contract.
 *
 * DispatcherDeps seam (fields this facade depends on):
 *   - store: VectorStore     — queryLex / queryVec for lex/vec dispatch
 *   - embed: EmbeddingProvider — embed() for vec/hyde; model + dimensions for status
 *   - graphTraverse? — optional; enables "graph" sub-queries (wired at assemble)
 *   - hydeGenerator? — optional; upgrades hyde from identity stub to LLM-backed
 *   - provenanceMap? — optional; enables provenance boost in RRF
 *   - rrfK? / graphDepth? — optional tuning knobs
 *
 * R18: NO import from src/search.
 */

import { dispatch } from "../retrieval/dispatcher.js";
import type { DispatcherDeps } from "../retrieval/dispatcher.js";
import type {
  McpSemanticQueryOptions,
  McpSemanticQueryResult,
  McpSemanticEmbeddingSyncOptions,
  McpSemanticEmbeddingSyncResult,
  McpStatusOptions,
  McpSemanticProviderStatus,
  McpSemanticCollectionResult,
  McpSemanticContextResult,
  McpSemanticCleanupResult,
  McpGraphBuildOptions,
  McpGraphBuildResult,
  McpGraphStatusResult,
  McpAxisFilters,
  McpRetrieveContextOptions,
  EngineSyncResult,
  EngineGraphBuildResult,
} from "./types.js";
import {
  queryOptionsToSubQueries,
  retrievalResultsToQueryResult,
  queryResultUnavailable,
} from "./query-mapper.js";
import {
  syncOptionsToEngineArgs,
  engineSyncResultToMcp,
  syncResultUnavailable,
  capsToEngineStatusResult,
  engineStatusResultToMcp,
  statusResultUnavailable,
  engineStatusToCollectionResult,
  engineStatusToContextResult,
  engineSyncResultToCleanupResult,
  cleanupResultUnavailable,
  graphBuildOptionsToEngineArgs,
  engineGraphBuildResultToMcp,
  engineGraphBuildToStatusResult,
} from "./op-mappers.js";

// ---------------------------------------------------------------------------
// Adapter facade
// ---------------------------------------------------------------------------

/**
 * Engine-side adapter for the 8 MCP ops.
 *
 * Construct with injected DispatcherDeps; the assemble step (later, serial)
 * wires the real VectorStore + EmbeddingProvider into those deps.
 */
export class McpEngineAdapter {
  /**
   * @param deps - Injected backend dependencies.
   *   `store` and `embed` are required; all other fields are optional hooks.
   *   This class never constructs any of them.
   */
  constructor(private readonly deps: DispatcherDeps) {}

  // -------------------------------------------------------------------------
  // 1. oms_semantic_query (centerpiece)
  // -------------------------------------------------------------------------

  /**
   * Execute a semantic query and return MCP-shaped results.
   *
   * Maps opts → TypedSubQuery[] → dispatch() → McpSemanticQueryResult.
   */
  async semanticQuery(opts: McpSemanticQueryOptions): Promise<McpSemanticQueryResult> {
    const subQueries = queryOptionsToSubQueries(opts);
    if (subQueries.length === 0) {
      return queryResultUnavailable("No sub-queries derived from options");
    }
    try {
      const k = opts.candidateLimit ?? 20;
      const results = await dispatch(subQueries, this.deps, k);
      return retrievalResultsToQueryResult(results, opts);
    } catch (err) {
      return queryResultUnavailable(err instanceof Error ? err.message : String(err));
    }
  }

  // -------------------------------------------------------------------------
  // 2. oms_sync_embeddings
  // -------------------------------------------------------------------------

  /**
   * Sync embeddings using the injected store + embed provider.
   *
   * Full orchestration (scan → chunk → embed → upsert) is a later wiring step.
   * This method defines the typed seam and returns a pass-through stub result
   * so the MCP contract is satisfied before the real impl lands.
   *
   * The mandatory `status` field in the success result is synthesized from
   * `deps.embed` (model id + dimensions) — the engine's source of truth at
   * sync time, mirroring `Extract<SemanticProviderStatus, { available: true }>`.
   */
  async syncEmbeddings(
    opts: McpSemanticEmbeddingSyncOptions,
  ): Promise<McpSemanticEmbeddingSyncResult> {
    try {
      const _args = syncOptionsToEngineArgs(opts);
      // Seam: real impl will chunk + embed + store.upsert() using this.deps.
      const stubResult: EngineSyncResult = { upserted: 0, skipped: 0, errors: 0 };
      const statusSnapshot: McpSemanticProviderStatus & { readonly available: true } = {
        available: true,
        storage: opts.storage ?? "oms-native-json",
        models: { embedding: this.deps.embed.model },
        index: { documents: { total: 0, vectors: 0 } },
      };
      return engineSyncResultToMcp(stubResult, opts, statusSnapshot);
    } catch (err) {
      return syncResultUnavailable(
        err instanceof Error ? err.message : String(err),
        opts,
      );
    }
  }

  // -------------------------------------------------------------------------
  // 3. oms_semantic_status
  // -------------------------------------------------------------------------

  /** Return status derived from the injected embed + store capabilities. */
  semanticStatus(_opts: McpStatusOptions): McpSemanticProviderStatus {
    try {
      const engineResult = capsToEngineStatusResult(this.deps.embed, this.deps.store);
      return engineStatusResultToMcp(engineResult);
    } catch (err) {
      return statusResultUnavailable(err instanceof Error ? err.message : String(err));
    }
  }

  // -------------------------------------------------------------------------
  // 4. oms_semantic_collections
  // -------------------------------------------------------------------------

  /** List embedding collections visible through the injected store. */
  listCollections(_opts: McpStatusOptions): McpSemanticCollectionResult {
    try {
      const engineResult = capsToEngineStatusResult(this.deps.embed, this.deps.store);
      return engineStatusToCollectionResult(engineResult);
    } catch (err) {
      return {
        available: false,
        reason: err instanceof Error ? err.message : String(err),
        collections: [],
      };
    }
  }

  // -------------------------------------------------------------------------
  // 5. oms_semantic_contexts
  // -------------------------------------------------------------------------

  /** List semantic contexts from the injected store. */
  listContexts(_opts: McpStatusOptions): McpSemanticContextResult {
    try {
      const engineResult = capsToEngineStatusResult(this.deps.embed, this.deps.store);
      return engineStatusToContextResult(engineResult);
    } catch (err) {
      return {
        available: false,
        reason: err instanceof Error ? err.message : String(err),
        contexts: [],
      };
    }
  }

  // -------------------------------------------------------------------------
  // 6. oms_semantic_cleanup
  // -------------------------------------------------------------------------

  /**
   * Remove orphaned embeddings from the injected store.
   *
   * Real impl will diff store docs against vault paths; stub returns zeroes.
   */
  cleanup(_opts: McpStatusOptions): McpSemanticCleanupResult {
    try {
      // Seam: real impl calls store methods to identify + remove orphaned rows.
      const stubResult: EngineSyncResult = { upserted: 0, skipped: 0, errors: 0 };
      return engineSyncResultToCleanupResult(stubResult);
    } catch (err) {
      return cleanupResultUnavailable(err instanceof Error ? err.message : String(err));
    }
  }

  // -------------------------------------------------------------------------
  // 7. oms_graph_build
  // -------------------------------------------------------------------------

  /**
   * Build the graph cache.
   *
   * Real impl invokes the graph builder from src/engine/graph (later wiring).
   * This method defines the typed seam and returns stub stats.
   */
  graphBuild(opts: McpGraphBuildOptions, vaultPath: string): McpGraphBuildResult {
    const _args = graphBuildOptionsToEngineArgs(opts, vaultPath);
    // Seam: real impl calls buildGraphCache() from src/engine/graph/builder.ts.
    const stubEngineResult: EngineGraphBuildResult = {
      notes: 0,
      edges: 0,
      generatedAt: new Date().toISOString(),
    };
    return engineGraphBuildResultToMcp(stubEngineResult);
  }

  // -------------------------------------------------------------------------
  // 8a. oms_graph_status
  // -------------------------------------------------------------------------

  /**
   * Return graph cache status.
   *
   * Real impl reads cache metadata from disk; stub reports "not built".
   */
  graphStatus(): McpGraphStatusResult {
    // Seam: real impl reads from graphCachePath(vault).
    return engineGraphBuildToStatusResult(null);
  }

  // -------------------------------------------------------------------------
  // 8b. oms_retrieve_by_axis  [DEFERRED — engine C2 not yet capable]
  // -------------------------------------------------------------------------

  /**
   * NOT YET WIRED — deferred to engine-swap step #5.
   *
   * The live contract (src/graph/cache.ts::retrieveByAxis) filters cached
   * GraphNote[] by concept / folder / wikilink / property-axis and returns
   * RetrieveHit[] shaped `{path, concept, folder, axes, wikilinks, score,
   * bodyPreview}`.  The engine's C2 graph (src/engine/graph/builder.ts)
   * currently only exports GraphEdge[] — it has no GraphNote with concept /
   * folder / axes / wikilinks metadata, no axis-filter query, and no body
   * preview index.
   *
   * Missing engine C2 capabilities required before this can be wired:
   *   1. A `EngineGraphNode` type carrying `concept`, `folder`, `axes`,
   *      `wikilinks` per note (analogous to GraphNote in src/graph/cache.ts).
   *   2. An `filterNodesByAxis(nodes, filters) → EngineGraphNode[]` function.
   *   3. A per-path body-preview index (`SearchDocument[]` equivalent).
   *   4. A top-level `engineRetrieveByAxis(vaultPath, filters)` that assembles
   *      the above and returns `McpRetrieveHit[]` (faithful mirror of RetrieveHit).
   */
  retrieveByAxis(_filters: McpAxisFilters): Promise<McpSemanticQueryResult> {
    throw new Error(
      "retrieve_by_axis not yet wired to engine C2 — deferred to swap step #5. " +
      "Missing: EngineGraphNode metadata, filterNodesByAxis(), body-preview index.",
    );
  }

  // -------------------------------------------------------------------------
  // 8c. oms_retrieve_context  [DEFERRED — engine C2 not yet capable]
  // -------------------------------------------------------------------------

  /**
   * NOT YET WIRED — deferred to engine-swap step #5.
   *
   * The live contract (src/retrieve/morning.ts::retrieveMorningContext) performs
   * local-graph exploration via src/graph/explore.ts::exploreLocalGraph() —
   * which walks GraphNote neighbours by concept / wikilink / frontmatter axes —
   * then fuses with semantic hits.  The engine has no equivalent of
   * `exploreLocalGraph` (src/engine/graph/ exposes only edge traversal from a
   * single seed path, not axis-filtered neighbourhood expansion).
   *
   * Missing engine C2 capabilities required before this can be wired:
   *   1. Same EngineGraphNode + filterNodesByAxis as retrieve_by_axis.
   *   2. An `exploreEngineGraph(nodes, edges, opts) → GraphExploreResult`
   *      equivalent that expands axis-seeded neighbours with scored reasons.
   *   3. Fusion of graph-explore results with semantic dispatch output.
   */
  retrieveContext(_opts: McpRetrieveContextOptions): Promise<McpSemanticQueryResult> {
    throw new Error(
      "retrieve_context not yet wired to engine C2 — deferred to swap step #5. " +
      "Missing: exploreEngineGraph(), EngineGraphNode metadata, axis-neighbour expansion.",
    );
  }
}
