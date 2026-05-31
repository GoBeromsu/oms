/**
 * HostAdapter — per-host integration interface.
 *
 * Each host (Claude Code, Codex, Hermes) has structurally asymmetric installation
 * paths, convention file names, and capability sets. This asymmetry is intentional
 * and documented in adapters/README.md. The interface is deliberately minimal:
 * resist the urge to unify what is genuinely different per host.
 */

export type HostId = "claude-code" | "codex" | "hermes";

export interface HostCapabilities {
  mcp: boolean;
  skills: boolean;
  /** Name of the host's top-level convention file (e.g. "CLAUDE.md"). */
  conventionFile: string;
}

export interface HostAdapter {
  readonly host: HostId;
  capabilities(): HostCapabilities;
  installManifest(vaultRoot: string): Promise<void>;
  installConventionFile(vaultRoot: string): Promise<void>;
}
