import { describe, it, expect } from "vitest";
import { createHashProjectionProvider } from "./provider.js";

describe("createHashProjectionProvider", () => {
  it("returns an EmbeddingProvider with correct model label", () => {
    const p = createHashProjectionProvider(64);
    expect(p.model).toBe("hash-projection:dim=64");
  });

  it("exposes correct dimensions", () => {
    const p = createHashProjectionProvider(128);
    expect(p.dimensions).toBe(128);
  });

  it("embed returns Float32Array of configured length", async () => {
    const p = createHashProjectionProvider(64);
    const v = await p.embed("hello world");
    expect(v).toBeInstanceOf(Float32Array);
    expect(v.length).toBe(64);
  });

  it("embedding is L2-normalised (magnitude ≈ 1)", async () => {
    const p = createHashProjectionProvider(64);
    const v = await p.embed("machine learning and graphs");
    let mag = 0;
    for (const x of v) mag += x * x;
    expect(Math.sqrt(mag)).toBeCloseTo(1, 5);
  });

  it("same text → identical vector (deterministic)", async () => {
    const p = createHashProjectionProvider(64);
    const v1 = await p.embed("Obsidian vault");
    const v2 = await p.embed("Obsidian vault");
    expect(Array.from(v1)).toEqual(Array.from(v2));
  });

  it("different texts produce different vectors", async () => {
    const p = createHashProjectionProvider(64);
    const v1 = await p.embed("apple");
    const v2 = await p.embed("orange");
    expect(Array.from(v1)).not.toEqual(Array.from(v2));
  });

  it("empty text returns zero vector without throwing", async () => {
    const p = createHashProjectionProvider(64);
    const v = await p.embed("");
    expect(v.length).toBe(64);
    let mag = 0;
    for (const x of v) mag += x * x;
    expect(mag).toBe(0);
  });

  it("dispose resolves without error", async () => {
    const p = createHashProjectionProvider(64);
    await expect(p.dispose()).resolves.toBeUndefined();
  });
});
