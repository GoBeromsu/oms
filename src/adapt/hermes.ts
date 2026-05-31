import type { HostAdapter, HostCapabilities, HostId } from "./HostAdapter.js";

export class HermesAdapter implements HostAdapter {
  readonly host: HostId = "hermes";

  capabilities(): HostCapabilities {
    return { mcp: true, skills: true, conventionFile: "SOUL.md" };
  }

  /** TODO: v1 — write Hermes manifest into vaultRoot */
  async installManifest(_vaultRoot: string): Promise<void> {
    throw new Error("not implemented in v0");
  }

  /** TODO: v1 — scaffold SOUL.md into vaultRoot */
  async installConventionFile(_vaultRoot: string): Promise<void> {
    throw new Error("not implemented in v0");
  }
}
