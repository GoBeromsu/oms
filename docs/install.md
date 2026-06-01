# Install Lexa

Lexa v0 is distributed as one npm/GitHub-release package that contains the CLI/runtime, the default ontology, host adapter assets, host-native skill/rule bundles, and shell installers. Claude Code, Codex, and Hermes all install a Lexa host surface backed by the same MCP capture/retrieve runtime.

## Prerequisites

- Node.js 18 or newer.
- `npm` on `PATH`.
- An Obsidian vault, or any folder of Markdown notes.
- Optional host CLIs: `claude`, `codex`, `hermes`.

## One-line install

Until npm publishing is unblocked, the installer installs the GitHub release tarball asset by default:

```bash
curl -fsSL https://raw.githubusercontent.com/GoBeromsu/lexa/main/scripts/install.sh | bash
```

Useful overrides:

```bash
# Pick one host instead of auto-detection.
curl -fsSL https://raw.githubusercontent.com/GoBeromsu/lexa/main/scripts/install.sh | bash -s -- --runtime claude

# Install every host adapter and point Lexa at a specific vault.
curl -fsSL https://raw.githubusercontent.com/GoBeromsu/lexa/main/scripts/install.sh | bash -s -- --runtime all --vault /path/to/vault

# Also execute external host CLIs where available, e.g. claude plugin/mcp commands.
curl -fsSL https://raw.githubusercontent.com/GoBeromsu/lexa/main/scripts/install.sh | bash -s -- --runtime all --vault /path/to/vault --execute
```

Environment knobs:

| Variable | Meaning |
| --- | --- |
| `LEXA_PACKAGE_SPEC` | npm package spec or tarball URL to install globally |
| `LEXA_INSTALL_RUNTIME` | `auto`, `all`, `claude`, `codex`, or `hermes` |
| `LEXA_VAULT` | vault path used for MCP registration |
| `LEXA_EXECUTE_EXTERNAL=1` | allow host CLI commands such as `claude plugin install` |

## CLI install

From a checkout or installed package:

```bash
npm ci
npm run build
npx @goberomsu/lexa install --runtime all --vault /path/to/vault --dry-run
npx @goberomsu/lexa install --runtime all --vault /path/to/vault --yes
```

Runtime selection follows the Ouroboros pattern:

1. Explicit `--runtime` wins.
2. `auto` detects `claude`, `codex`, and `hermes` on `PATH`.
3. If nothing is detected, `auto` defaults to Claude Code for conservative first-run behavior; use `--runtime all` to install every host surface.
4. `all` installs every known adapter surface.

## What install writes

| Host | Install behavior |
| --- | --- |
| Claude Code | Upserts `~/.claude/mcp.json` entry for `lexa`; prints Claude plugin/MCP commands; with `--execute`, runs `claude plugin install` and `claude mcp add` when the CLI is available. |
| Codex | Installs `~/.codex/rules/lexa.md`, `~/.codex/skills/lexa-*`, copies adapter files to `~/.codex/plugins/lexa`, and writes a managed `[mcp_servers.lexa]` block plus `LEXA_AGENT_RUNTIME=codex` env in `~/.codex/config.toml`. |
| Hermes | Installs `~/.hermes/skills/knowledge-management/lexa/`, copies adapter files to `~/.hermes/adapters/lexa`, and writes `mcp_servers.lexa` in `~/.hermes/config.yaml`. |

All host writes are namespaced under `lexa` and are reversible with `lexa uninstall`.

## Legacy setup flow

`setup` still adopts a vault into the Lexa ontology and can print the Claude Code plan:

```bash
npx @goberomsu/lexa setup --vault /path/to/vault --yes --install-claude
```

Typical printed commands look like:

```bash
claude plugin install /path/to/lexa/adapters/claude-code
claude mcp add lexa -- npx @goberomsu/lexa mcp --vault /path/to/vault
```

## Uninstall

Preview first:

```bash
lexa uninstall --runtime all --dry-run
```

Remove host registrations and adapter files:

```bash
lexa uninstall --runtime all --yes
```

One-line uninstall:

```bash
curl -fsSL https://raw.githubusercontent.com/GoBeromsu/lexa/main/scripts/uninstall.sh | bash -s -- --yes
```

The uninstaller removes Lexa host registrations and adapter files. It does **not** remove vault notes or `vault/.lexa/` ontology data. Pass `--keep-package` to the shell uninstaller if you want to keep the globally installed package.

## Verify the install

```bash
npx @goberomsu/lexa doctor --vault /path/to/vault
lexa install --runtime all --vault /path/to/vault --dry-run
claude plugin validate adapters/claude-code
```

Inside a host runtime, verify the MCP server by listing MCP tools or asking for Lexa graph/status. The server exposes status, graph build, axis retrieval, lazy note loading, contract validation, and gated capture tools.
