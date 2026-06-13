/**
 * Hash-projection EmbeddingProvider.
 *
 * Algorithm mirrors src/search/semantic-embedding-hash.ts: tokens are SHA-1
 * hashed into a fixed-width vector via bucket assignment + sign flip, then
 * L2-normalised. Re-implemented from the algorithm description; no verbatim
 * code copied from the search layer.
 */

import { createHash } from "node:crypto";
import type { EmbeddingProvider } from "../types.js";

// ---------------------------------------------------------------------------
// Tokenizer (self-contained; mirrors the word-split pattern in search layer)
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

// ---------------------------------------------------------------------------
// Hash-projection core
// ---------------------------------------------------------------------------

/**
 * Project `text` into a normalised `dimensions`-wide Float32Array via
 * SHA-1 bucket hashing.  Deterministic: same text → same vector.
 */
function hashProject(text: string, dimensions: number): Float32Array {
  const vector = new Float32Array(dimensions);
  for (const token of tokenize(text)) {
    const digest = createHash("sha1").update(token).digest();
    const idx = (digest[0] ?? 0) % dimensions;
    const sign = (digest[1] ?? 0) % 2 === 0 ? 1 : -1;
    vector[idx] = (vector[idx] ?? 0) + sign;
  }
  // L2-normalise so cosine similarity = dot product
  let mag = 0;
  for (const v of vector) mag += v * v;
  if (mag === 0) return vector;
  const norm = Math.sqrt(mag);
  for (let i = 0; i < vector.length; i++) {
    vector[i] = (vector[i] ?? 0) / norm;
  }
  return vector;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a deterministic hash-projection EmbeddingProvider.
 *
 * Suitable for M1 testing and offline environments without a GGUF model.
 * Produces a normalised Float32Array of the specified `dimensions` (default 64).
 */
export function createHashProjectionProvider(dimensions = 64): EmbeddingProvider {
  return {
    model: `hash-projection:dim=${dimensions}`,
    dimensions,
    embed(text: string): Promise<Float32Array> {
      return Promise.resolve(hashProject(text, dimensions));
    },
    dispose(): Promise<void> {
      return Promise.resolve();
    },
  };
}
