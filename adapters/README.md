# Adapter Contract

## Principle

Lexa's **core** (ontology loading, convention validation, graph/search runtime targets, and MCP server once implemented) is written once.
Each **adapter** absorbs exactly one host's structural differences — manifest schema,
hook format, invocation sigil, and convention-file name — so adding a new host
means adding one new adapter directory, not touching core.

Per-host structural asymmetry is documented here, **not abstracted away**.
The goal is legibility: when something breaks on one host, you read its adapter,
not a shared abstraction layer.

---

## Host Comparison Table

| Host | Manifest | Convention file | Sigil | Status |
|------|----------|----------------|-------|--------|
| **claude-code** | `.claude-plugin/plugin.json` | `CLAUDE.md` | `/` | REAL installable v0 |
| **codex** | `.codex-plugin/plugin.json` | `AGENTS.md` | `$` | Native skills + MCP install (v0) |
| **hermes** | `manifest.json` | `SOUL.md` + context files | (built-in tools) | Native skills + MCP install (v0) |

---

## Adapter Structure

Each adapter lives at `adapters/<host>/` and contains:

```
adapters/<host>/
  <manifest-dir>/
    plugin.json       # Host-specific manifest (schema varies per host — see below)
  skills/             # Host-specific skill wrappers/bundles
    <verb>/
      SKILL.md
  CLAUDE.md           # OR AGENTS.md OR SOUL.md — convention-file shim for this host
```

---

## Per-Host Structural Notes

### claude-code (REAL installable v0)

Release contract: the npm tarball must include `adapters/claude-code/` because `npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz setup --install-claude` prints a packaged adapter path for `claude plugin install`.

- **Manifest**: `.claude-plugin/plugin.json`
  - Schema: `{ name, version, description, author, license, keywords, skills: string[] }`
  - `skills` is an **array of directory-path strings** relative to the plugin root (e.g. `"./skills/setup/"`).
  - Each path must contain a `SKILL.md`.
- **Convention file**: `CLAUDE.md` — append `adapters/claude-code/CLAUDE.md` to your project's `CLAUDE.md`.
- **Sigil**: `/` (e.g. `/lexa-setup`).
- **Hooks**: none in v0 (hook format is `hooks/hooks.json` multi-script array — roadmap).
- **Install**: `claude plugin install path/to/adapters/claude-code` or point Claude Code at the adapter directory.

### codex (native skills + MCP install v0)

- **Manifest**: `.codex-plugin/plugin.json`
  - Schema differs from claude-code: codex uses a unified `codex-native-hook.mjs` instead of `hooks.json`.
  - Skills are invoked with `$` sigil instead of `/`.
- **Convention file**: `AGENTS.md` — append `adapters/codex/AGENTS.md` to your project's `AGENTS.md`.
- **Status**: v0 native install. `lexa install --runtime codex` installs `~/.codex/rules/lexa.md`, namespaced `~/.codex/skills/lexa-*`, a managed `[mcp_servers.lexa]` block in `~/.codex/config.toml`, and a copy of the adapter under `~/.codex/plugins/lexa`.

### hermes (native skills + MCP install v0)

- **Manifest**: `manifest.json` (Hermes/Nous Research format — schema TBD).
  - Hermes skills register on agentskills.io; no local manifest equivalent exists yet.
- **Convention file**: `SOUL.md` + context files — append `adapters/hermes/SOUL.md` to your Hermes session context.
- **Sigil**: N/A (Hermes uses built-in tools + MCP, not a `/`/`$` sigil system).
- **Status**: v0 native install. `lexa install --runtime hermes` installs the skill bundle under `~/.hermes/skills/knowledge-management/lexa/`, registers `mcp_servers.lexa` in `~/.hermes/config.yaml`, and keeps an adapter copy under `~/.hermes/adapters/lexa`.

---

## MCP Backbone

The cross-host mechanism is an **MCP server** (`src/mcp/server.ts`) that exposes
contract validation, retrieve, graph/status, and gated capture tools.

All three hosts natively support MCP (`.mcp.json` for claude-code and codex; "any MCP server" for Hermes).
In the current repository, `src/mcp/server.ts` starts a real stdio MCP server via `lexa mcp`.

The MCP server currently exposes status/read/cache/capture tools:
`lexa_graph_status`, `lexa_graph_build`, `lexa_list_concepts`,
`lexa_retrieve_by_axis`, `lexa_lazy_load_note`, `lexa_validate_contract`,
`lexa_capture_prepare`, and `lexa_capture_commit`.
Capture commit is gated by path-safety, vault-confinement, and contract validation. The CLI (`npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz setup`, `npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz install`, `npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz uninstall`, `npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz doctor`) remains the real surface for lifecycle commands.

---

## Adding a New Host

1. Create `adapters/<host>/`.
2. Write the host-specific manifest in the correct subdirectory and schema.
3. Write the convention-file shim (`CLAUDE.md` / `AGENTS.md` / `SOUL.md` / whatever the host uses).
4. Write skill wrappers that shell out to `npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz <verb>` (for lifecycle) or call the MCP server (for capture/retrieve).
5. Document the host's structural differences in this table.
6. Do **not** modify `core/` or add host-specific logic to shared code.
