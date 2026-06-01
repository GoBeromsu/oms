# Install Lexa

Lexa v0 is distributed as one npm package that contains the CLI/runtime, the default ontology, and the Claude Code adapter. Claude Code is the only real installable adapter in v0; Codex and Hermes remain documented stubs until their host-specific skills are wired.

## Prerequisites

- Node.js 18 or newer.
- An Obsidian vault, or any folder of Markdown notes.
- Claude Code CLI for the Claude adapter/plugin flow.

## Quick start from a checkout

```bash
npm ci
npm run build
npx lexa setup --vault /path/to/vault --yes --install-claude
```

The `--install-claude` flag is a dry-run. It prints the exact commands to install the Claude Code plugin adapter and register the MCP server; it does not mutate Claude configuration by itself.

Typical printed commands look like:

```bash
claude plugin install /path/to/lexa/adapters/claude-code
claude mcp add lexa -- npx lexa mcp --vault /path/to/vault
```

After running those commands, restart Claude Code and use the Lexa skills:

- `/lexa-setup`
- `/lexa-doctor`
- `/lexa-define`
- `/lexa-capture`
- `/lexa-retrieve`

## Quick start from npm

After Lexa is published, the npm package is the install root for all runtime assets:

- `dist/` — CLI and MCP runtime
- `core/` — shipped default ontology and skills
- `adapters/claude-code/` — Claude Code plugin adapter
- `docs/install.md` and `docs/release.md` — release/install guidance

Use either `npx` or a global install:

```bash
npx lexa setup --vault /path/to/vault --yes --install-claude
# or
npm install -g lexa
lexa setup --vault /path/to/vault --yes --install-claude
```

Then run the printed Claude plugin and MCP registration commands.

## Verify the install

```bash
npx lexa doctor --vault /path/to/vault
claude plugin validate adapters/claude-code
```

Inside Claude Code, verify the MCP server by listing MCP tools or asking for Lexa graph/status. The server exposes status, graph build, axis retrieval, lazy note loading, contract validation, and gated capture tools.

## Host support boundary

| Host | v0 status |
| --- | --- |
| Claude Code | Real installable adapter plus MCP registration |
| Codex | Stub only; use the shared MCP server manually until adapter skills are wired |
| Hermes | Stub only; use the shared MCP server manually until adapter registration is defined |

Lexa intentionally does not ship an Ouroboros-style curl installer in v0. The release first proves npm package contents, unpacked-tarball setup/MCP smoke, and Claude plugin validation. A one-command installer can wrap those proven primitives later.
