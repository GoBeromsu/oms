import type { HostAdapter, HostCapabilities, HostId } from "./HostAdapter.js";

export class ClaudeCodeAdapter implements HostAdapter {
  readonly host: HostId = "claude-code";

  capabilities(): HostCapabilities {
    return { mcp: true, skills: true, conventionFile: "CLAUDE.md" };
  }

  /** TODO: v1 — write .claude/manifest.json into vaultRoot */
  async installManifest(_vaultRoot: string): Promise<void> {
    throw new Error("not implemented in v0");
  }

  /** TODO: v1 — scaffold CLAUDE.md into vaultRoot */
  async installConventionFile(_vaultRoot: string): Promise<void> {
    throw new Error("not implemented in v0");
  }
}
