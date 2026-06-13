/**
 * Golden-set parity test suite.
 *
 * GATED: only runs when RUN_GOLDEN=1 is set in the environment.
 *   npm test                      → skipped (normal CI)
 *   RUN_GOLDEN=1 npm test         → executes full parity check
 *   OMS_VAULT=/path/to/vault RUN_GOLDEN=1 npm test → real vault run
 *
 * This gate encodes R2 (manual-only / no-CI) for the golden harness.
 */

import { describe, it, expect } from "vitest";
import { runHarness, printHarnessReport } from "./harness.js";
import { QUERY_COUNT, QUERIES_BY_TYPE } from "./queries.js";

// ---------------------------------------------------------------------------
// Static structural assertions (run unconditionally — no vault required)
// ---------------------------------------------------------------------------

describe("golden query set — structural validation", () => {
  it("has at least 20 queries", () => {
    expect(QUERY_COUNT).toBeGreaterThanOrEqual(20);
  });

  it("has at least 4 lex queries", () => {
    expect(QUERIES_BY_TYPE.lex.length).toBeGreaterThanOrEqual(4);
  });

  it("has at least 4 vec queries", () => {
    expect(QUERIES_BY_TYPE.vec.length).toBeGreaterThanOrEqual(4);
  });

  it("has at least 4 hyde queries", () => {
    expect(QUERIES_BY_TYPE.hyde.length).toBeGreaterThanOrEqual(4);
  });

  it("has at least 4 graph queries", () => {
    expect(QUERIES_BY_TYPE.graph.length).toBeGreaterThanOrEqual(4);
  });

  it("has at least 1 cross-language (Korean+English) query", () => {
    const all = [
      ...QUERIES_BY_TYPE.lex,
      ...QUERIES_BY_TYPE.vec,
      ...QUERIES_BY_TYPE.hyde,
      ...QUERIES_BY_TYPE.graph,
    ];
    const crossLang = all.filter((q) => q.tags?.includes("cross-language"));
    expect(crossLang.length).toBeGreaterThanOrEqual(1);
  });

  it("has at least 1 technical-concept query", () => {
    const all = [
      ...QUERIES_BY_TYPE.lex,
      ...QUERIES_BY_TYPE.vec,
      ...QUERIES_BY_TYPE.hyde,
      ...QUERIES_BY_TYPE.graph,
    ];
    const tech = all.filter((q) => q.tags?.includes("technical-concept"));
    expect(tech.length).toBeGreaterThanOrEqual(1);
  });

  it("has at least 1 personal-capture query", () => {
    const all = [
      ...QUERIES_BY_TYPE.lex,
      ...QUERIES_BY_TYPE.vec,
      ...QUERIES_BY_TYPE.hyde,
      ...QUERIES_BY_TYPE.graph,
    ];
    const personal = all.filter((q) => q.tags?.includes("personal-capture"));
    expect(personal.length).toBeGreaterThanOrEqual(1);
  });

  it("all queries have non-empty query strings", () => {
    const all = [
      ...QUERIES_BY_TYPE.lex,
      ...QUERIES_BY_TYPE.vec,
      ...QUERIES_BY_TYPE.hyde,
      ...QUERIES_BY_TYPE.graph,
    ];
    for (const q of all) {
      expect(q.query.trim().length, `query ${q.id} must be non-empty`).toBeGreaterThan(0);
    }
  });

  it("all query IDs are unique", () => {
    const all = [
      ...QUERIES_BY_TYPE.lex,
      ...QUERIES_BY_TYPE.vec,
      ...QUERIES_BY_TYPE.hyde,
      ...QUERIES_BY_TYPE.graph,
    ];
    const ids = all.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// Runtime parity test — GATED behind RUN_GOLDEN=1
// ---------------------------------------------------------------------------

describe.skipIf(!process.env["RUN_GOLDEN"])("golden-set parity — engine vs baseline", () => {
  it(
    "engine recall@10 per-type average >= baseline AND no type below 80% of baseline",
    async () => {
      const vaultPath = process.env["OMS_VAULT"] ?? process.cwd();

      const report = await runHarness({ vaultPath });

      // Always print the report for visibility
      printHarnessReport(report);

      // Assert per-type parity
      for (const type of ["lex", "vec", "hyde", "graph"] as const) {
        const { engineAvg, baselineAvg, parityPass } = report.byType[type];
        expect(
          parityPass,
          `Type '${type}' failed parity: engine=${(engineAvg * 100).toFixed(1)}% < 80% of baseline=${(baselineAvg * 100).toFixed(1)}%`,
        ).toBe(true);
      }

      expect(
        report.overallPass,
        "Overall parity check failed — see query-level report above",
      ).toBe(true);
    },
    // Allow up to 5 minutes for a full vault run
    300_000,
  );

  it("report contains one row per golden query", async () => {
    const vaultPath = process.env["OMS_VAULT"] ?? process.cwd();
    const report = await runHarness({ vaultPath });
    expect(report.queries.length).toBe(QUERY_COUNT);
  });

  it("report JSON is serialisable", async () => {
    const vaultPath = process.env["OMS_VAULT"] ?? process.cwd();
    const report = await runHarness({ vaultPath });
    expect(() => JSON.stringify(report)).not.toThrow();
  });
});
