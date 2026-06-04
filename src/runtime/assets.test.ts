import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveBundledAssetPaths } from "./assets.js";

describe("resolveBundledAssetPaths", () => {
  it("resolves package assets when called from the built runtime module", () => {
    // Given
    const packageRoot = path.join(path.sep, "tmp", "oms-package");
    const moduleUrl = pathToFileURL(
      path.join(packageRoot, "dist", "runtime", "assets.js"),
    ).href;

    // When
    const paths = resolveBundledAssetPaths(moduleUrl);

    // Then
    expect(paths).toEqual({
      packageRoot,
      ontologyDir: path.join(packageRoot, "core", "ontology"),
      adapterRoot: path.join(packageRoot, "adapters"),
      claudeAdapterDir: path.join(packageRoot, "adapters", "claude-code"),
    });
  });

  it("resolves the same package assets when called from the source runtime module", () => {
    // Given
    const packageRoot = path.join(path.sep, "tmp", "oms-package");
    const moduleUrl = pathToFileURL(
      path.join(packageRoot, "src", "runtime", "assets.ts"),
    ).href;

    // When
    const paths = resolveBundledAssetPaths(moduleUrl);

    // Then
    expect(paths).toEqual({
      packageRoot,
      ontologyDir: path.join(packageRoot, "core", "ontology"),
      adapterRoot: path.join(packageRoot, "adapters"),
      claudeAdapterDir: path.join(packageRoot, "adapters", "claude-code"),
    });
  });
});
