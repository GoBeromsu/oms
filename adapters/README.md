# Adapter Contract

## Principle

Lexa's **core** (skills, agents, ontology, MCP server) is written once.
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
| **codex** | `.codex-plugin/plugin.json` | `AGENTS.md` | `$` | Stub (v0) |
| **hermes** | `manifest.json` | `SOUL.md` + context files | (built-in tools) | Stub (v0) |

---

## Adapter Structure

Each adapter lives at `adapters/<host>/` and contains:

```
adapters/<host>/
  <manifest-dir>/
    plugin.json       # Host-specific manifest (schema varies per host — see below)
  skills/             # Host-specific skill wrappers (claude-code only in v0)
    <verb>/
      SKILL.md
  CLAUDE.md           # OR AGENTS.md OR SOUL.md — convention-file shim for this host
```

---

## Per-Host Structural Notes

### claude-code (REAL installable v0)

- **Manifest**: `.claude-plugin/plugin.json`
  - Schema: `{ name, version, description, author, license, keywords, skills: string[] }`
  - `skills` is an **array of directory-path strings** relative to the plugin root (e.g. `"./skills/setup/"`).
  - Each path must contain a `SKILL.md`.
- **Convention file**: `CLAUDE.md` — append `adapters/claude-code/CLAUDE.md` to your project's `CLAUDE.md`.
- **Sigil**: `/` (e.g. `/lexa-setup`).
- **Hooks**: none in v0 (hook format is `hooks/hooks.json` multi-script array — roadmap).
- **Install**: `claude plugin install path/to/adapters/claude-code` or point Claude Code at the adapter directory.

### codex (stub)

- **Manifest**: `.codex-plugin/plugin.json`
  - Schema differs from claude-code: codex uses a unified `codex-native-hook.mjs` instead of `hooks.json`.
  - Skills are invoked with `$` sigil instead of `/`.
- **Convention file**: `AGENTS.md` — append `adapters/codex/AGENTS.md` to your project's `AGENTS.md`.
- **Status**: v0 stub. Skills not yet wired. MCP backbone (roadmap) will provide shared tool surface.

### hermes (stub)

- **Manifest**: `manifest.json` (Hermes/Nous Research format — schema TBD).
  - Hermes skills register on agentskills.io; no local manifest equivalent exists yet.
- **Convention file**: `SOUL.md` + context files — append `adapters/hermes/SOUL.md` to your Hermes session context.
- **Sigil**: N/A (Hermes uses built-in tools + MCP, not a `/`/`$` sigil system).
- **Status**: v0 stub. MCP backbone (roadmap) will provide shared tool surface.

---

## MCP Backbone (Roadmap)

The intended cross-host mechanism is an **MCP server** (`src/mcp/server.ts`) that exposes
`capture`, `retrieve`, and `validate_frontmatter` tools.

All three hosts natively support MCP (`.mcp.json` for claude-code and codex; "any MCP server" for Hermes).
In v0, `src/mcp/server.ts` is an honest no-op stub — it exports a tool registry but executes nothing.

When the MCP server is real, each adapter's skills will call it instead of shelling out to the CLI.
The CLI (`npx lexa setup`, `npx lexa doctor`) remains the real surface for lifecycle commands.

---

## Adding a New Host

1. Create `adapters/<host>/`.
2. Write the host-specific manifest in the correct subdirectory and schema.
3. Write the convention-file shim (`CLAUDE.md` / `AGENTS.md` / `SOUL.md` / whatever the host uses).
4. Write skill wrappers that shell out to `npx lexa <verb>` (for lifecycle) or call the MCP server (for capture/retrieve).
5. Document the host's structural differences in this table.
6. Do **not** modify `core/` or add host-specific logic to shared code.
