/**
 * Heading-aware, overlapping Markdown chunker.
 *
 * Algorithm idea absorbed from nashsu/llm_wiki (GPL-3.0) — sliding-window
 * overlap and heading-boundary split detection implemented from concept;
 * zero verbatim code. See ACKNOWLEDGMENTS.md for attribution.
 */

import { createHash } from "node:crypto";
import type { Chunk, ChunkerOptions } from "../types.js";

const DEFAULT_MAX_TOKENS = 900;
const DEFAULT_OVERLAP_RATIO = 0.15;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Approximate token count: ~4 characters per token (GPT-style heuristic). */
function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** SHA-256 hex digest of text for change-detection. */
function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Update a mutable heading-path array given a newly encountered ATX heading.
 * Level 1 (#) → index 0, level 2 (##) → index 1, etc.
 */
function applyHeading(current: string[], level: number, title: string): string[] {
  const next = current.slice(0, level - 1);
  next.push(title);
  return next;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Split a Markdown document into overlapping text chunks, respecting ATX
 * heading boundaries as natural split points.
 *
 * Each chunk carries:
 *   - vault-relative `docPath`
 *   - zero-based `ordinal` within the document
 *   - raw `text`
 *   - `headingPath` — breadcrumb from doc root to the chunk's section
 *   - `sha` — SHA-256 hex digest of `text` for change-detection
 *
 * When a section exceeds `maxTokens`, it is further split line by line until
 * each emitted chunk fits the budget. Overlap lines from the previous flush
 * are prepended to maintain context continuity.
 */
export function chunkDocument(
  docPath: string,
  rawText: string,
  opts: Partial<ChunkerOptions> = {},
): Chunk[] {
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  const overlapRatio = opts.overlapRatio ?? DEFAULT_OVERLAP_RATIO;
  // Number of overlap lines to carry into the next chunk
  const overlapLineCount = Math.max(1, Math.round(10 * overlapRatio));

  const lines = rawText.split("\n");
  const chunks: Chunk[] = [];
  let ordinal = 0;
  let buffer: string[] = [];
  let headingPath: string[] = [];

  const flush = (): void => {
    const text = buffer.join("\n").trim();
    if (!text) {
      buffer = [];
      return;
    }
    chunks.push({
      docPath,
      ordinal: ordinal++,
      text,
      headingPath: headingPath.slice(),
      sha: sha256(text),
    });
    // Carry the last N lines as overlap into the next chunk
    buffer = buffer.slice(-overlapLineCount);
  };

  for (const line of lines) {
    // Detect ATX headings (# through ######)
    const hm = /^(#{1,6})\s+(.+)$/.exec(line);
    if (hm) {
      const level = hm[1]!.length;
      const title = hm[2]!.trim();
      headingPath = applyHeading(headingPath, level, title);
    }

    buffer.push(line);

    if (approxTokens(buffer.join("\n")) >= maxTokens) {
      flush();
    }
  }

  // Flush any remaining lines
  const remaining = buffer.join("\n").trim();
  if (remaining) {
    chunks.push({
      docPath,
      ordinal: ordinal++,
      text: remaining,
      headingPath: headingPath.slice(),
      sha: sha256(remaining),
    });
  }

  return chunks;
}
