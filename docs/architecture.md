# Lexa Architecture

> Canonical product architecture lives in [`docs/harness-architecture.md`](./harness-architecture.md).
> This file summarizes the host/runtime posture and current repository reality.

## Posture: Axis Graph Harness Inside the Host

Lexa lives *inside* each host agent and operates beneath it. The control direction is:

```
Host agent (Claude Code / Codex / Hermes)
  └── invokes Lexa
        └── reads/writes Obsidian vault (plain markdown)
```

This is the opposite of an OS-above orchestrator (e.g., ouroboros in its orchestrator mode), which drives host agents top-down. Lexa borrows the installable harness idea — skills, deterministic gates, and eventually MCP state/runtime surfaces — but it is not in charge of the host agent.

Lexa's product posture is an **axis graph harness**:

- frontmatter fields are user-owned retrieval axes,
- folders create physical folder-to-concept placement edges,
- wikilinks create explicit user-authored relation edges,
- note bodies are payload loaded after axis/search narrowing,
- capture and retrieval are separate flows over the same ontology contract.

The full terminology lock is in the harness architecture doc. In short: Lexa helps the user operate their own knowledge system so notes can be retrieved and reused later; it does not fill the body content for them.

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
│  src/mcp/server.ts        stdio MCP: status/read/cache/capture   │
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

## MCP Backbone — Current Boundary and Roadmap

MCP is the shared cross-host transport for retrieve, graph/status, validation, cache, and safe capture operations. In the current repository, `src/mcp/server.ts` starts a real stdio MCP server through `lexa mcp`.

The correct runtime framing is:

1. **Now**: CLI setup/doctor and convention engine are real; Claude Code skills exist as installable/guided surfaces.
2. **Next**: install shell can print exact dry-run Claude plugin and MCP registration commands (`lexa setup --install-claude`) without claiming a live runtime.
3. **Now in Phase 2**: real stdio MCP read/status tools are available through `lexa mcp`.
4. **Now in Phase 3**: derived graph/search cache tools are available for axis-first retrieval and lazy body load.
5. **Now in Phase 4**: safe capture prepare/commit tools are available after path-safety and vault-confinement tests.

## Retrieval View Compatibility

Existing concept YAML may use `lenses`. Keep that key backward-compatible, but explain it to users as a **retrieval view**: an output shape applied after axis graph narrowing and optional search. A retrieval view is not the graph itself.

## Stack

- **TypeScript** (`module: NodeNext`, Node ≥ 18) — runtime for the CLI, convention engine, and adapter interfaces.
- **Markdown** — conventions, skills, agents, and adapter documentation.
- **YAML** — ontology data files (`concepts/*.yaml`, `taxonomy.yaml`); parsed by the `yaml` npm package (the only runtime dependency in v0).
- **No Obsidian app dependency** — a vault is just a folder of markdown files. Lexa reads and writes it directly via the filesystem.
- **No new heavy dependencies** — any additional dep requires explicit approval (spec constraint).
