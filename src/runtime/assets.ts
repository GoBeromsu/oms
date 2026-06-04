import path from "node:path";
import { fileURLToPath } from "node:url";

export interface BundledAssetPaths {
  readonly packageRoot: string;
  readonly ontologyDir: string;
  readonly adapterRoot: string;
  readonly claudeAdapterDir: string;
}

export function resolveBundledAssetPaths(moduleUrl: string = import.meta.url): BundledAssetPaths {
  const modulePath = fileURLToPath(moduleUrl);
  const packageRoot = path.resolve(path.dirname(modulePath), "../..");

  return {
    packageRoot,
    ontologyDir: path.join(packageRoot, "core", "ontology"),
    adapterRoot: path.join(packageRoot, "adapters"),
    claudeAdapterDir: path.join(packageRoot, "adapters", "claude-code"),
  };
}
