import {
  cleanupSemanticStore,
  getSemanticDocument,
  listSemanticCollections,
  listSemanticContexts,
  multiGetSemanticDocuments,
  querySemanticStore,
  readSemanticStatus,
  syncSemanticEmbeddingStore,
} from "../search/semantic.js";
import {
  documentGetOptionsFromArgs,
  documentMultiGetOptionsFromArgs,
  embeddingSyncOptionsFromArgs,
  semanticStatusOptionsFromArgs,
  semanticOptionsFromArgs,
  semanticQueryOptionsFromArgs,
  type ParseResult,
} from "./semantic-retrieve-args.js";
import type { McpEngineAdapter } from "../engine/mcp/facade.js";

export { semanticMcpTools, retrieveContextSemanticInputProperties } from "./semantic-schemas.js";
export { semanticOptionsFromArgs };

/**
 * Dispatch a semantic / sync / cleanup / document MCP op.
 *
 * When `adapter` is supplied (the main stdio MCP server, post-swap), the
 * native engine owns sync / query / status / collections / contexts / cleanup.
 * When it is absent (the localhost semantic-http CLI), every op falls back to
 * the src/search layer — the legacy path that predates the engine swap.
 *
 * oms_get_document / oms_multi_get_documents have NO engine equivalent
 * (GAP-9, accepted): they always route to src/search regardless of adapter.
 */
export async function handleSemanticTool(
  name: string,
  args: Record<string, unknown> | undefined,
  vault: string,
  adapter?: McpEngineAdapter | null,
): Promise<ParseResult<unknown> | undefined> {
  if (name === "oms_sync_embeddings") {
    if (adapter) {
      return { ok: true, value: await adapter.syncEmbeddings(embeddingSyncOptionsFromArgs(vault, args)) };
    }
    return { ok: true, value: await syncSemanticEmbeddingStore(embeddingSyncOptionsFromArgs(vault, args)) };
  }

  if (name === "oms_semantic_query" || name === "query") {
    if (adapter) {
      return { ok: true, value: await adapter.semanticQuery(semanticQueryOptionsFromArgs(vault, args)) };
    }
    return { ok: true, value: await querySemanticStore(semanticQueryOptionsFromArgs(vault, args)) };
  }

  if (name === "oms_semantic_status" || name === "status") {
    if (adapter) {
      return { ok: true, value: adapter.semanticStatus(semanticStatusOptionsFromArgs(vault, args)) };
    }
    return { ok: true, value: await readSemanticStatus(semanticStatusOptionsFromArgs(vault, args)) };
  }

  if (name === "oms_semantic_collections") {
    const statusOptions = semanticStatusOptionsFromArgs(vault, args);
    if (adapter) {
      return { ok: true, value: adapter.listCollections(statusOptions) };
    }
    return { ok: true, value: await listSemanticCollections(statusOptions) };
  }

  if (name === "oms_semantic_contexts") {
    const statusOptions = semanticStatusOptionsFromArgs(vault, args);
    if (adapter) {
      return { ok: true, value: adapter.listContexts(statusOptions) };
    }
    return { ok: true, value: await listSemanticContexts(statusOptions) };
  }

  if (name === "oms_semantic_cleanup") {
    const statusOptions = semanticStatusOptionsFromArgs(vault, args);
    if (adapter) {
      return { ok: true, value: await adapter.cleanup(statusOptions) };
    }
    return { ok: true, value: await cleanupSemanticStore(statusOptions) };
  }

  if (name === "oms_get_document" || name === "get") {
    const parsed = documentGetOptionsFromArgs(args);
    return parsed.ok ? { ok: true, value: await getSemanticDocument({ ...parsed.value, vault }) } : parsed;
  }

  if (name === "oms_multi_get_documents" || name === "multi_get") {
    const parsed = documentMultiGetOptionsFromArgs(args);
    return parsed.ok ? { ok: true, value: await multiGetSemanticDocuments({ ...parsed.value, vault }) } : parsed;
  }

  return undefined;
}
