/**
 * McpEngineAdapter — engine-side adapter facade for the 10 MCP ops.
 *
 * Receives DispatcherDeps + the vault root as INJECTED dependencies; never
 * instantiates VectorStore, EmbeddingProvider, or any other backend. Backend
 * construction is the assemble step (assemble.ts), which passes the real
 * EngineStore + EmbeddingProvider via DispatcherDeps and the vault path here.
 *
 * This class owns the translation between MCP op inputs/outputs and the
 * engine's retrieval / sync / graph contracts:
 *   - semantic_query      → dispatch() over the RRF pipeline
 *   - sync_embeddings     → syncEngineStore() (vault scan → chunk → embed → upsert)
 *   - semantic_status / collections / contexts → caps probe of DispatcherDeps
 *   - semantic_cleanup    → orphan diff (store paths − live vault paths)
 *   - graph_build / status → builder.ts edge graph + node index, cached on disk
 *   - retrieve_by_axis    → node-index axis filter + lexical score
 *   - retrieve_context    → axis-seeded local-graph exploration + optional semantic fan-out
 *
 * R18: NO import from src/search.
 */

import path from "node:path";
import { dispatch } from "../retrieval/dispatcher.js";
import type { DispatcherDeps } from "../retrieval/dispatcher.js";
import { syncEngineStore, walkMarkdown } from "../embed/sync.js";
import type { EngineStore } from "../embed/store.js";
import {
  buildGraph,
  saveCachedGraph,
  loadCachedGraph,
  loadCachedGraphMeta,
  buildNodeIndex,
  saveNodeIndex,
  loadNodeIndex,
} from "../graph/builder.js";
import type { EngineGraphNode } from "../graph/node.js";
import { filterNodesByAxis, searchScore } from "../graph/node.js";
import { exploreEngineGraph } from "../graph/explore.js";
import type { EngineGraphExploreNode } from "../graph/explore.js";
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
  McpSemanticSearchHit,
  EngineSyncResult,
} from "./types.js";
import {
  queryOptionsToSubQueries,
  retrievalResultsToQueryResult,
  queryResultUnavailable,
} from "./query-mapper.js";
import {
  engineSyncResultToMcp,
  syncResultUnavailable,
  capsToEngineStatusResult,
  engineStatusResultToMcp,
  statusResultUnavailable,
  engineStatusToCollectionResult,
  engineStatusToContextResult,
  cleanupResultUnavailable,
  graphBuildOptionsToEngineArgs,
  engineGraphBuildResultToMcp,
  engineGraphBuildToStatusResult,
} from "./op-mappers.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

// ---------------------------------------------------------------------------
// Adapter facade
// ---------------------------------------------------------------------------

/**
 * Engine-side adapter for the 10 MCP ops.
 *
 * Construct with injected DispatcherDeps + the vault root; the assemble step
 * wires the real EngineStore + EmbeddingProvider into those deps.
 */
export class McpEngineAdapter {
  /**
   * @param deps      - Injected backend dependencies (store + embed required).
   * @param vaultPath - Absolute vault root, used by graph / sync / cleanup /
   *                    retrieve ops that are vault-scoped. Required so tsc
   *                    enforces it at every construction site (RISK-4).
   */
  constructor(
    private readonly deps: DispatcherDeps,
    private readonly vaultPath: string,
  ) {}

  // -------------------------------------------------------------------------
  // Cache-path + node-index helpers
  // -------------------------------------------------------------------------

  private graphCachePath(vault: string): string {
    return path.join(vault, ".oms", "cache", "engine", "graph.json");
  }

  private nodeCachePath(vault: string): string {
    return path.join(vault, ".oms", "cache", "engine", "node-index.json");
  }

  /** Load the node index from cache, building it live on a cache miss. */
  private async loadOrBuildNodes(): Promise<EngineGraphNode[]> {
    const cached = await loadNodeIndex(this.nodeCachePath(this.vaultPath));
    if (cached !== null) return cached;
    return buildNodeIndex({ vaultPath: this.vaultPath });
  }

  // -------------------------------------------------------------------------
  // 1. oms_semantic_query (centerpiece)
  // -------------------------------------------------------------------------

  /**
   * Execute a semantic query and return MCP-shaped results.
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
   * Sync the vault into the engine store: scan → chunk → embed → upsert.
   *
   * Delegates to syncEngineStore() (embed/sync.ts), which performs SHA-256
   * incremental diffing so unchanged chunks are skipped. The mandatory
   * `status` field is synthesized from deps.embed + the run counters.
   *
   * Note: syncEngineStore opens its own provider+store internally; the GGUF
   * pool deduplicates by loadPromise per process so this is safe (RISK-1).
   */
  async syncEmbeddings(
    opts: McpSemanticEmbeddingSyncOptions,
  ): Promise<McpSemanticEmbeddingSyncResult> {
    try {
      const syncResult = await syncEngineStore({
        vault: opts.vault,
        collection: opts.collection,
        collectionPath: opts.collectionPath,
        modelPath: opts.modelPath,
        embed: opts.embed ?? true,
      });
      if (!syncResult.available) {
        return syncResultUnavailable(syncResult.reason ?? "sync unavailable", opts);
      }
      const engineResult: EngineSyncResult = {
        upserted: syncResult.added + syncResult.updated,
        skipped: syncResult.skipped,
        errors: 0,
      };
      const statusSnapshot: McpSemanticProviderStatus & { readonly available: true } = {
        available: true,
        storage: opts.storage ?? "oms-native-json",
        models: { embedding: this.deps.embed.model },
        index: {
          documents: {
            total: syncResult.scanned,
            vectors: syncResult.added + syncResult.updated,
          },
        },
      };
      return engineSyncResultToMcp(engineResult, opts, statusSnapshot);
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
   * Remove orphaned documents from the store: any stored doc_path that no
   * longer exists in the live vault is cleared (meta + vec + FTS).
   */
  async cleanup(_opts: McpStatusOptions): Promise<McpSemanticCleanupResult> {
    try {
      const store = this.deps.store as EngineStore;
      const livePaths = new Set<string>();
      for await (const rel of walkMarkdown(this.vaultPath, this.vaultPath)) {
        livePaths.add(rel);
      }
      const storePaths = store.listDocPaths();
      let removed = 0;
      for (const docPath of storePaths) {
        if (!livePaths.has(docPath)) {
          store.clearDocument(docPath);
          removed++;
        }
      }
      return {
        available: true,
        storage: "oms-native-json",
        removedDocuments: removed,
        remainingDocuments: storePaths.length - removed,
        collections: 1,
      };
    } catch (err) {
      return cleanupResultUnavailable(err instanceof Error ? err.message : String(err));
    }
  }

  // -------------------------------------------------------------------------
  // 7. oms_graph_build
  // -------------------------------------------------------------------------

  /**
   * Build the edge graph + node index and persist both to .oms/cache/engine/.
   * On dryRun, report stats from the existing cache without rebuilding.
   */
  async graphBuild(opts: McpGraphBuildOptions, vaultPath: string): Promise<McpGraphBuildResult> {
    const args = graphBuildOptionsToEngineArgs(opts, vaultPath);
    const graphCachePath = this.graphCachePath(args.vaultPath);

    if (args.dryRun) {
      const meta = await loadCachedGraphMeta(graphCachePath);
      if (meta !== null) {
        const noteSet = new Set(meta.edges.flatMap((e) => [e.from, e.to]));
        return engineGraphBuildResultToMcp({
          notes: noteSet.size,
          edges: meta.edges.length,
          generatedAt: meta.generatedAt,
        });
      }
      return engineGraphBuildResultToMcp({
        notes: 0,
        edges: 0,
        generatedAt: new Date().toISOString(),
      });
    }

    const edges = await buildGraph({ vaultPath: args.vaultPath });
    await saveCachedGraph(graphCachePath, edges);

    const nodes = await buildNodeIndex({ vaultPath: args.vaultPath });
    await saveNodeIndex(this.nodeCachePath(args.vaultPath), nodes);

    const noteSet = new Set(edges.flatMap((e) => [e.from, e.to]));
    return engineGraphBuildResultToMcp({
      notes: noteSet.size,
      edges: edges.length,
      generatedAt: new Date().toISOString(),
    });
  }

  // -------------------------------------------------------------------------
  // 8a. oms_graph_status
  // -------------------------------------------------------------------------

  /** Report graph cache status (notes / edges / generatedAt) from disk. */
  async graphStatus(vaultPath: string): Promise<McpGraphStatusResult> {
    const meta = await loadCachedGraphMeta(this.graphCachePath(vaultPath));
    if (meta === null) return engineGraphBuildToStatusResult(null);
    const noteSet = new Set(meta.edges.flatMap((e) => [e.from, e.to]));
    return engineGraphBuildToStatusResult({
      notes: noteSet.size,
      edges: meta.edges.length,
      generatedAt: meta.generatedAt,
    });
  }

  // -------------------------------------------------------------------------
  // 8b. oms_retrieve_by_axis
  // -------------------------------------------------------------------------

  /**
   * Filter the node index by axis (concept / folder / property / value /
   * wikilink), rank by lexical overlap with the optional query, return hits.
   * Axis metadata (concept / folder / axes / wikilinks) is JSON-encoded into
   * the hit's `context` field for callers that need it (RISK-6).
   */
  async retrieveByAxis(filters: McpAxisFilters): Promise<McpSemanticQueryResult> {
    try {
      const nodes = await this.loadOrBuildNodes();
      const limit = clamp(filters.limit ?? 10, 1, 50);
      const filtered = filterNodesByAxis(nodes, {
        concept: filters.concept,
        folder: filters.folder,
        property: filters.property,
        value: filters.value,
        wikilink: filters.wikilink,
      });
      const query = filters.query ?? "";
      const scored = filtered
        .map((node) => ({ node, score: searchScore(node, query) }))
        .sort((a, b) => b.score - a.score || a.node.path.localeCompare(b.node.path))
        .slice(0, limit);
      const hits: McpSemanticSearchHit[] = scored.map(({ node, score }) => ({
        docid: node.path,
        score,
        uri: node.path,
        path: node.path,
        snippet: node.bodyPreview,
        context: JSON.stringify({
          concept: node.concept,
          folder: node.folder,
          axes: node.axes,
          wikilinks: node.wikilinks,
        }),
        evidence: { lexical: true, vector: false },
      }));
      return { available: true, hits };
    } catch (err) {
      return { available: false, reason: err instanceof Error ? err.message : String(err), hits: [] };
    }
  }

  // -------------------------------------------------------------------------
  // 8c. oms_retrieve_context
  // -------------------------------------------------------------------------

  /**
   * Axis-seeded local-graph exploration: filter nodes to seeds, expand the
   * neighbourhood via property-value / wikilink / backlink reasons, then
   * optionally fan out semantic sub-queries through dispatch(). Hits are
   * assembled seeds → neighbours → semantic (no re-ranking — mirrors the
   * floor contract). Dropped semantic sub-fields are the documented GAP-10.
   */
  async retrieveContext(opts: McpRetrieveContextOptions): Promise<McpSemanticQueryResult> {
    try {
      const nodes = await this.loadOrBuildNodes();
      let edges = await loadCachedGraph(this.graphCachePath(this.vaultPath));
      if (edges === null) edges = await buildGraph({ vaultPath: this.vaultPath });

      const exploreResult = exploreEngineGraph(nodes, edges, {
        concept: opts.concept,
        folder: opts.folder,
        property: opts.property,
        value: opts.value,
        wikilink: opts.wikilink,
        query: opts.query,
        limit: opts.limit,
        maxNeighbors: opts.maxNeighbors,
      });

      let semanticHits: McpSemanticSearchHit[] = [];
      if (opts.semanticSearches && opts.semanticSearches.length > 0) {
        const first = opts.semanticSearches[0];
        const queryResult = await this.semanticQuery({
          query: first?.query ?? opts.query ?? "",
          searches: opts.semanticSearches,
          limit: opts.maxNeighbors ?? 10,
        });
        if (queryResult.available) semanticHits = [...queryResult.hits];
      }

      const nodeToHit = (n: EngineGraphExploreNode, source: string): McpSemanticSearchHit => ({
        docid: n.path,
        score: n.score,
        uri: n.path,
        path: n.path,
        snippet: n.bodyPreview,
        context: JSON.stringify({
          source,
          concept: n.concept,
          folder: n.folder,
          axes: n.axes,
          reasons: n.reasons,
        }),
        evidence: { lexical: true, vector: false },
      });

      const hits: McpSemanticSearchHit[] = [
        ...exploreResult.seeds.map((n) => nodeToHit(n, "oms-seed")),
        ...exploreResult.neighbors.map((n) => nodeToHit(n, "oms-neighbor")),
        ...semanticHits,
      ];
      return { available: true, hits };
    } catch (err) {
      return { available: false, reason: err instanceof Error ? err.message : String(err), hits: [] };
    }
  }
}
