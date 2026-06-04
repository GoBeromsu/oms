import {
  exploreLocalGraph,
  type GraphExploreNode,
  type GraphExploreOptions,
  type GraphExploreResult,
} from "../graph/explore.js";
import {
  queryQmd,
  readQmdStatus,
  type QmdCommandRunner,
  type QmdHitEvidence,
  type QmdProviderStatus,
  type QmdSearchHit,
} from "../search/qmd.js";

export type MorningHitSource = "oms-seed" | "oms-neighbor" | "qmd";
export type QmdFusionScope = "global" | "graph";

export interface MorningRetrieveOptions extends GraphExploreOptions {
  readonly qmd?: {
    readonly enabled?: boolean;
    readonly collection?: string;
    readonly limit?: number;
    readonly runner?: QmdCommandRunner;
    readonly scope?: QmdFusionScope;
  };
}

export interface MorningRetrieveHit {
  readonly source: MorningHitSource;
  readonly path: string;
  readonly title?: string;
  readonly score: number;
  readonly snippet: string;
  readonly evidence?: QmdHitEvidence;
  readonly graphReasons?: GraphExploreNode["reasons"];
}

export interface MorningRetrieveResult {
  readonly mode: "oms-local-graph-qmd-fusion";
  readonly providers: {
    readonly graph: GraphExploreResult["provider"];
    readonly qmd: QmdProviderStatus | { readonly available: false; readonly reason: "disabled" };
  };
  readonly graph: GraphExploreResult;
  readonly qmdHits: readonly QmdSearchHit[];
  readonly hits: readonly MorningRetrieveHit[];
}

function graphHit(source: "oms-seed" | "oms-neighbor", node: GraphExploreNode): MorningRetrieveHit {
  return {
    source,
    path: node.path,
    score: node.score,
    snippet: node.bodyPreview,
    graphReasons: node.reasons,
  };
}

function qmdHit(hit: QmdSearchHit): MorningRetrieveHit {
  return {
    source: "qmd",
    path: hit.path,
    title: hit.title,
    score: hit.score,
    snippet: hit.snippet,
    evidence: hit.evidence,
  };
}

function graphCandidatePaths(graph: GraphExploreResult): Set<string> {
  return new Set([
    ...graph.seeds.map((node) => node.path),
    ...graph.neighbors.map((node) => node.path),
  ]);
}

function filteredQmdHits(
  opts: MorningRetrieveOptions,
  graph: GraphExploreResult,
  hits: readonly QmdSearchHit[],
): readonly QmdSearchHit[] {
  if (opts.qmd?.scope !== "graph") return hits;
  const allowedPaths = graphCandidatePaths(graph);
  return hits.filter((hit) => allowedPaths.has(hit.path));
}

async function loadQmd(opts: MorningRetrieveOptions): Promise<{
  status: MorningRetrieveResult["providers"]["qmd"];
  hits: readonly QmdSearchHit[];
}> {
  if (opts.qmd?.enabled === false) {
    return { status: { available: false, reason: "disabled" }, hits: [] };
  }

  const status = await readQmdStatus({ runner: opts.qmd?.runner });
  if (!status.available) {
    return { status, hits: [] };
  }

  const queryResult = await queryQmd({
    query: opts.query ?? "",
    collection: opts.qmd?.collection,
    limit: opts.qmd?.limit ?? opts.limit,
    runner: opts.qmd?.runner,
  });
  if (!queryResult.available) {
    return { status: queryResult, hits: [] };
  }

  return { status, hits: queryResult.hits };
}

export async function retrieveMorningContext(opts: MorningRetrieveOptions): Promise<MorningRetrieveResult> {
  const graph = await exploreLocalGraph(opts);
  const qmd = await loadQmd(opts);
  const qmdHits = filteredQmdHits(opts, graph, qmd.hits);
  const hits = [
    ...graph.seeds.map((node) => graphHit("oms-seed", node)),
    ...graph.neighbors.map((node) => graphHit("oms-neighbor", node)),
    ...qmdHits.map(qmdHit),
  ];

  return {
    mode: "oms-local-graph-qmd-fusion",
    providers: {
      graph: graph.provider,
      qmd: qmd.status,
    },
    graph,
    qmdHits,
    hits,
  };
}
