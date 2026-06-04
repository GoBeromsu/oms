import {
  buildGraphCache,
  readGraphCache,
  type GraphNote,
  type OMSGraphCache,
  type RetrieveByAxisOptions,
  type SearchDocument,
} from "./cache.js";

export type LocalGraphProvider = "cache" | "headless-scan";
export type GraphConnectionKind = "property-value" | "wikilink" | "backlink";

export interface GraphExploreOptions extends RetrieveByAxisOptions {
  maxNeighbors?: number;
  useCache?: boolean;
}

export interface GraphConnectionReason {
  kind: GraphConnectionKind;
  from: string;
  to: string;
  axis?: string;
  value?: string;
  target?: string;
}

export interface GraphExploreNode {
  path: string;
  concept: string | null;
  folder: string;
  axes: Record<string, string[]>;
  wikilinks: string[];
  score: number;
  bodyPreview: string;
  reasons: GraphConnectionReason[];
}

export interface GraphExploreResult {
  provider: LocalGraphProvider;
  mode: "axis-seed-local-neighborhood";
  bodyPolicy: "lazy-load";
  seeds: GraphExploreNode[];
  neighbors: GraphExploreNode[];
  connections: GraphConnectionReason[];
}

async function loadGraph(opts: GraphExploreOptions): Promise<{
  cache: OMSGraphCache;
  provider: LocalGraphProvider;
}> {
  if (opts.useCache !== false) {
    const cached = await readGraphCache(opts.vault);
    if (cached) {
      return { cache: cached, provider: "cache" };
    }
  }

  return {
    cache: await buildGraphCache({ vault: opts.vault, ontology: opts.ontology, write: false }),
    provider: "headless-scan",
  };
}

function tokenize(text: string): string[] {
  const terms = text
    .toLowerCase()
    .match(/[\p{L}\p{N}][\p{L}\p{N}_-]{1,}/gu);
  return Array.from(new Set(terms ?? [])).sort();
}

function matchesAxis(note: GraphNote, opts: RetrieveByAxisOptions): boolean {
  if (opts.concept && note.concept !== opts.concept) return false;
  if (opts.folder && note.folder !== opts.folder) return false;
  if (opts.wikilink && !note.wikilinks.includes(opts.wikilink)) return false;
  if (opts.property) {
    const values = note.axes[opts.property] ?? [];
    if (opts.value && !values.includes(opts.value)) return false;
    if (!opts.value && values.length === 0) return false;
  }
  return true;
}

function searchScore(search: SearchDocument | undefined, query: string | undefined): number {
  if (!query || !search) return 0;
  const queryTerms = tokenize(query);
  return queryTerms.filter((term) => search.terms.includes(term)).length;
}

function normalizeTarget(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "")
    .toLowerCase();
}

function noteStem(notePath: string): string {
  return notePath.replace(/\.md$/i, "");
}

function noteBasename(notePath: string): string {
  const parts = noteStem(notePath).split("/");
  return parts[parts.length - 1] ?? noteStem(notePath);
}

function noteMatchesWikilinkTarget(note: GraphNote, target: string): boolean {
  const normalized = normalizeTarget(target);
  return normalized === normalizeTarget(noteStem(note.path)) || normalized === normalizeTarget(noteBasename(note.path));
}

function connectionKey(reason: GraphConnectionReason): string {
  return [
    reason.kind,
    reason.from,
    reason.to,
    reason.axis ?? "",
    reason.value ?? "",
    reason.target ?? "",
  ].join("\u0000");
}

function nodeFromNote(
  note: GraphNote,
  search: SearchDocument | undefined,
  score: number,
  reasons: GraphConnectionReason[],
): GraphExploreNode {
  return {
    path: note.path,
    concept: note.concept,
    folder: note.folder,
    axes: note.axes,
    wikilinks: note.wikilinks,
    score,
    bodyPreview: search?.bodyPreview ?? "",
    reasons,
  };
}

export async function exploreLocalGraph(opts: GraphExploreOptions): Promise<GraphExploreResult> {
  const { cache, provider } = await loadGraph(opts);
  const seedLimit = Math.max(1, Math.min(opts.limit ?? 5, 50));
  const neighborLimit = Math.max(0, Math.min(opts.maxNeighbors ?? 10, 100));
  const searchByPath = new Map(cache.search.map((item) => [item.path, item]));
  const noteByPath = new Map(cache.notes.map((note) => [note.path, note]));

  const seeds = cache.notes
    .filter((note) => matchesAxis(note, opts))
    .map((note) => nodeFromNote(note, searchByPath.get(note.path), searchScore(searchByPath.get(note.path), opts.query), []))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, seedLimit);

  const seedPaths = new Set(seeds.map((seed) => seed.path));
  const neighborReasons = new Map<string, GraphConnectionReason[]>();
  const seenConnections = new Set<string>();
  const propertyEdges = cache.edges.filter((edge) => edge.type === "property-value");
  const wikilinkEdges = cache.edges.filter((edge) => edge.type === "wikilink");

  function addNeighborReason(notePath: string, reason: GraphConnectionReason): void {
    if (seedPaths.has(notePath)) return;
    if (!noteByPath.has(notePath)) return;
    const key = connectionKey(reason);
    if (seenConnections.has(key)) return;
    seenConnections.add(key);
    const existing = neighborReasons.get(notePath);
    if (existing) {
      existing.push(reason);
    } else {
      neighborReasons.set(notePath, [reason]);
    }
  }

  for (const seed of seeds) {
    const seedNote = noteByPath.get(seed.path);
    if (!seedNote) continue;

    for (const edge of propertyEdges) {
      if (edge.from !== seed.path || !edge.axis || !edge.value) continue;
      for (const peerEdge of propertyEdges) {
        if (peerEdge.from === seed.path || peerEdge.to !== edge.to) continue;
        addNeighborReason(peerEdge.from, {
          kind: "property-value",
          from: seed.path,
          to: peerEdge.from,
          axis: edge.axis,
          value: edge.value,
        });
      }
    }

    for (const edge of wikilinkEdges) {
      if (edge.from === seed.path) {
        for (const note of cache.notes) {
          if (!noteMatchesWikilinkTarget(note, edge.to)) continue;
          addNeighborReason(note.path, {
            kind: "wikilink",
            from: seed.path,
            to: note.path,
            target: edge.to,
          });
        }
        continue;
      }

      if (noteMatchesWikilinkTarget(seedNote, edge.to)) {
        addNeighborReason(edge.from, {
          kind: "backlink",
          from: edge.from,
          to: seed.path,
          target: edge.to,
        });
      }
    }
  }

  const connections = Array.from(neighborReasons.values())
    .flat()
    .sort((a, b) => connectionKey(a).localeCompare(connectionKey(b)));
  const neighbors = Array.from(neighborReasons.entries())
    .map(([notePath, reasons]) => {
      const note = noteByPath.get(notePath);
      if (!note) return undefined;
      const graphScore = reasons.length * 10;
      return nodeFromNote(
        note,
        searchByPath.get(note.path),
        graphScore + searchScore(searchByPath.get(note.path), opts.query),
        reasons.sort((a, b) => connectionKey(a).localeCompare(connectionKey(b))),
      );
    })
    .filter((node) => node !== undefined)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, neighborLimit);

  return {
    provider,
    mode: "axis-seed-local-neighborhood",
    bodyPolicy: "lazy-load",
    seeds,
    neighbors,
    connections,
  };
}
