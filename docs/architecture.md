# Lexa Architecture

## Posture: Plugin-Inside, Not OS-Above

Lexa lives *inside* each host agent and operates beneath it. The control direction is:

```
Host agent (Claude Code / Codex / Hermes)
  └── invokes Lexa
        └── reads/writes Obsidian vault (plain markdown)
```

This is the opposite of an OS-above orchestrator (e.g., ouroboros in its orchestrator mode), which drives host agents top-down. Lexa deliberately borrows ouroboros's *semantic convention format* (concept + intent + fields + lenses) but rejects its heavy orchestration posture. The result is a lighter plugin that adds zero new runtime dependencies to the host — it is simply invoked, not in charge.

## The 3-Host Handshake: Shared CORE + Thin ADAPTERS

All knowledge logic (validation, ontology loading, folder resolution) is written **once** inside the shared CORE and exposed via the `lexa` CLI and — in a future version — via a shared MCP server. Host differences (manifest schema, hook format, invocation sigil, convention-file name) are absorbed by thin per-host ADAPTERS. Adding a fourth host means writing one more adapter, not touching the core.

| | Claude Code | Codex | Hermes |
|---|---|---|---|
| MCP backbone | `.mcp.json` | `.mcp.json` | "any MCP server" |
| Skills sigil | `/skill` | `$skill` | agentskills.io |
| Convention file | `CLAUDE.md` / `AGENTS.md` | `AGENTS.md` | `SOUL.md` + context files |
| Local vault access | yes | yes | yes |

`adapters/claude-code/` is the only real installable adapter in v0. `adapters/codex/` and `adapters/hermes/` are manifest + convention-file stubs that document the contract without wiring up live installs.

## Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Host agent                                                      │
│  (Claude Code | Codex | Hermes)                                  │
│                                                                  │
│  thin ADAPTER                                                    │
│  ├─ plugin.json / plugin stub / SOUL.md fragment                 │
│  └─ shells out to: npx lexa setup | lexa doctor | lexa define    │
└───────────────────────────┬──────────────────────────────────────┘
                            │ invokes
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  Lexa convention layer  (src/ — TypeScript, Node ≥18)            │
│                                                                  │
│  src/cli/lexa.ts          CLI verbs: setup / doctor / define     │
│  src/ontology/loader.ts   load concepts/*.yaml + taxonomy.yaml   │
│  src/ontology/resolver.ts resolve note path → Concept            │
│  src/conventions/         validateFrontmatter → ValidationResult │
│  src/adapt/HostAdapter.ts per-host adapter interface             │
│  src/mcp/server.ts        [ROADMAP] no-op stub in v0             │
└───────────────────────────┬──────────────────────────────────────┘
                            │ reads / writes
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  Obsidian vault  (any plain-markdown folder)                     │
│                                                                  │
│  vault/.lexa/                                                    │
│  ├─ taxonomy.yaml          folder ↔ concept + per-folder intent  │
│  └─ ontology/concepts/     user-owned concept YAML files         │
│                                                                  │
│  vault/references/note.md                                        │
│  vault/notes/idea.md       ... any existing folder layout        │
└──────────────────────────────────────────────────────────────────┘
```

## MCP Backbone — ROADMAP

MCP as the shared cross-host transport for capture, retrieve, and validate operations is the intended v1+ architecture. In v0, `src/mcp/server.ts` is an **honest no-op stub**: it exports a tool registry object and does not throw on import, but no MCP server is actually started and no `@modelcontextprotocol/sdk` dependency is required. All working code in v0 goes through the `lexa` CLI.

Docs that mention "MCP backbone" as a present-tense feature are incorrect. The correct framing is: MCP is the intended cross-host backbone; v0 ships the CLI and the convention engine only.

## Stack

- **TypeScript** (`module: NodeNext`, Node ≥ 18) — runtime for the CLI, convention engine, and adapter interfaces.
- **Markdown** — conventions, skills, agents, and adapter documentation.
- **YAML** — ontology data files (`concepts/*.yaml`, `taxonomy.yaml`); parsed by the `yaml` npm package (the only runtime dependency in v0).
- **No Obsidian app dependency** — a vault is just a folder of markdown files. Lexa reads and writes it directly via the filesystem.
- **No new heavy dependencies** — any additional dep requires explicit approval (spec constraint).
