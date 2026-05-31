import type { HostAdapter, HostCapabilities, HostId } from "./HostAdapter.js";

export class CodexAdapter implements HostAdapter {
  readonly host: HostId = "codex";

  capabilities(): HostCapabilities {
    return { mcp: true, skills: true, conventionFile: "AGENTS.md" };
  }

  /** TODO: v1 — write Codex manifest into vaultRoot */
  async installManifest(_vaultRoot: string): Promise<void> {
    throw new Error("not implemented in v0");
  }

  /** TODO: v1 — scaffold AGENTS.md into vaultRoot */
  async installConventionFile(_vaultRoot: string): Promise<void> {
    throw new Error("not implemented in v0");
  }
}
