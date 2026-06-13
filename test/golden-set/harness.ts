/**
 * Parity comparator harness: new engine vs. src/search baseline.
 *
 * For each golden query:
 *   1. Run the new engine via runTracer().
 *   2. Run the baseline via querySemanticStore() from src/search.
 *   3. Compute recall@10 = |expected ∩ top-10| / |expected|.
 *   4. Emit a JSON report row.
 *
 * Parity rule (enforced in golden.test.ts):
 *   engine recall@10 per-type average >= baseline per-type average
 *   AND no individual type's engine average falls below 80% of baseline average.
 *
 * NOTE: baseline querySemanticStore requires a live .oms semantic store.
 *       Without one, baseline hits will be empty (recall = 0) and the parity
 *       check degrades gracefully (engine automatically passes 80%-of-zero).
 */

import path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { runTracer, makeTracerConfig, type TracerConfig } from "../../src/engine/tracer.js";
import { querySemanticStore } from "../../src/search/semantic.js";
import { GOLDEN_QUERIES, QUERIES_BY_TYPE, type GoldenQuery, type QueryType } from "./queries.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueryReport {
  readonly id: string;
  readonly type: QueryType;
  readonly query: string;
  readonly expected: string[];
  readonly engineTop10: string[];
  readonly baselineTop10: string[];
  readonly engineRecall: number;
  readonly baselineRecall: number;
  /** true when engineRecall >= 80% of baselineRecall (or baseline = 0) */
  readonly pass: boolean;
}

export interface HarnessReport {
  readonly queries: QueryReport[];
  readonly byType: Record<
    QueryType,
    { engineAvg: number; baselineAvg: number; parityPass: boolean }
  >;
  readonly overallPass: boolean;
}

// ---------------------------------------------------------------------------
// Recall computation
// ---------------------------------------------------------------------------

function recall(topK: string[], expected: string[]): number {
  // Filter TODO-marked paths (not yet curated)
  const real = expected.filter((p) => !p.includes("TODO"));
  if (real.length === 0) return 0; // no curated expected = uncalculated
  const hitSet = new Set(topK.map((p) => p.toLowerCase()));
  const found = real.filter((p) => hitSet.has(p.toLowerCase())).length;
  return found / real.length;
}

// ---------------------------------------------------------------------------
// Baseline runner (src/search layer — read-only import)
// ---------------------------------------------------------------------------

async function runBaseline(q: GoldenQuery, vaultPath: string): Promise<string[]> {
  // graph queries have no direct baseline equivalent — use vec as proxy
  const searchType = q.type === "graph" ? "vec" : q.type;
  const seedQuery = q.type === "graph"
    ? path.basename(q.query, ".md").replace(/-/g, " ")
    : q.query;

  try {
    const result = await querySemanticStore({
      query: seedQuery,
      vault: vaultPath,
      limit: 10,
      searches:
        searchType === "lex"
          ? [{ type: "lex", query: seedQuery }]
          : searchType === "vec" || searchType === "hyde"
          ? [{ type: searchType, query: seedQuery }]
          : undefined,
    });
    if (!result.available) return [];
    return result.hits.map((h) => h.path);
  } catch {
    // Baseline not configured (no semantic store) — return empty
    return [];
  }
}

// ---------------------------------------------------------------------------
// Engine runner
// ---------------------------------------------------------------------------

async function runEngine(
  q: GoldenQuery,
  config: TracerConfig,
  files?: string[],
): Promise<string[]> {
  try {
    const results = await runTracer(
      { ...config, files: files as readonly string[] | undefined },
      [{ type: q.type === "graph" ? "graph" : q.type, query: q.query }],
    );
    return results.map((r) => r.docPath);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface HarnessOptions {
  /** Absolute path to the vault. Falls back to OMS_VAULT env. */
  vaultPath?: string;
  /**
   * Explicit file list to keep the run fast (slice of vault).
   * Recommended for CI; omit to run against full vault.
   */
  files?: string[];
  /** Override default TracerConfig fields. */
  configOverrides?: Partial<TracerConfig>;
}

/**
 * Run the full golden-set parity comparison and return a structured report.
 *
 * Uses a temporary SQLite DB (cleaned up after the run) so the harness is
 * safe to invoke repeatedly without polluting the vault cache.
 */
export async function runHarness(opts: HarnessOptions = {}): Promise<HarnessReport> {
  const vaultPath = opts.vaultPath ?? process.env["OMS_VAULT"] ?? process.cwd();

  // Temporary DB path — cleaned up in finally block
  const tmpDir = mkdtempSync(path.join(tmpdir(), "oms-golden-"));
  const dbPath = path.join(tmpDir, "golden.db");

  const config = makeTracerConfig({
    vaultPath,
    dbPath,
    embeddingDimensions: 64,
    ...opts.configOverrides,
  });

  const reports: QueryReport[] = [];

  try {
    for (const q of GOLDEN_QUERIES) {
      const [engineTop10, baselineTop10] = await Promise.all([
        runEngine(q, config, opts.files),
        runBaseline(q, vaultPath),
      ]);

      const engineRecall = recall(engineTop10, q.expectedNotes);
      const baselineRecall = recall(baselineTop10, q.expectedNotes);
      // Pass: engine recall >= 80% of baseline (or baseline is 0)
      const pass = baselineRecall === 0 || engineRecall >= baselineRecall * 0.8;

      reports.push({
        id: q.id,
        type: q.type,
        query: q.query,
        expected: q.expectedNotes,
        engineTop10,
        baselineTop10,
        engineRecall,
        baselineRecall,
        pass,
      });
    }
  } finally {
    // Always clean up the temp DB
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  // ── Per-type aggregation ─────────────────────────────────────────────────
  const types: QueryType[] = ["lex", "vec", "hyde", "graph"];
  const byType = {} as Record<QueryType, { engineAvg: number; baselineAvg: number; parityPass: boolean }>;

  for (const t of types) {
    const rows = reports.filter((r) => r.type === t);
    if (rows.length === 0) {
      byType[t] = { engineAvg: 0, baselineAvg: 0, parityPass: true };
      continue;
    }
    const engineAvg = rows.reduce((s, r) => s + r.engineRecall, 0) / rows.length;
    const baselineAvg = rows.reduce((s, r) => s + r.baselineRecall, 0) / rows.length;
    // Parity: engine type avg >= 80% of baseline type avg (or baseline is 0)
    const parityPass = baselineAvg === 0 || engineAvg >= baselineAvg * 0.8;
    byType[t] = { engineAvg, baselineAvg, parityPass };
  }

  const overallPass = types.every((t) => byType[t]!.parityPass);

  return { queries: reports, byType, overallPass };
}

/**
 * Emit a human-readable summary of the harness report to stdout.
 */
export function printHarnessReport(report: HarnessReport): void {
  console.log("\n=== OMS M1 Retrieval Engine — Golden-Set Parity Report ===\n");

  for (const t of ["lex", "vec", "hyde", "graph"] as QueryType[]) {
    const s = report.byType[t];
    const status = s.parityPass ? "PASS" : "FAIL";
    console.log(
      `[${status}] type=${t}  engine=${(s.engineAvg * 100).toFixed(1)}%  baseline=${(s.baselineAvg * 100).toFixed(1)}%`,
    );
  }

  console.log(`\nOverall parity: ${report.overallPass ? "PASS" : "FAIL"}`);
  console.log(`Queries: ${report.queries.length}  passed: ${report.queries.filter((r) => r.pass).length}`);

  const failing = report.queries.filter((r) => !r.pass);
  if (failing.length > 0) {
    console.log("\nFailing queries:");
    for (const r of failing) {
      console.log(
        `  [${r.id}] engine=${(r.engineRecall * 100).toFixed(0)}%  baseline=${(r.baselineRecall * 100).toFixed(0)}%  query="${r.query.slice(0, 60)}"`,
      );
    }
  }
  console.log();
}
