# Install OMS

OMS v0 is distributed as one npm/GitHub-release package that contains the CLI/runtime, the default ontology, host adapter assets, host-native skill/rule bundles, and shell installers. Claude Code, Codex, and Hermes all install a OMS host surface backed by the same MCP capture/retrieve runtime.

## Prerequisites

- Node.js 18 or newer.
- `npm` on `PATH`.
- An Obsidian vault, or any folder of Markdown notes.
- Optional host CLIs: `claude`, `codex`, `hermes`.

## One-line install

Until npm publishing is unblocked, the installer installs the GitHub release tarball asset by default:

```bash
curl -fsSL https://raw.githubusercontent.com/GoBeromsu/oms/main/scripts/install.sh | bash
```

Useful overrides:

```bash
# Pick one host instead of auto-detection.
curl -fsSL https://raw.githubusercontent.com/GoBeromsu/oms/main/scripts/install.sh | bash -s -- --runtime claude

# Install every host adapter and point OMS at a specific vault.
curl -fsSL https://raw.githubusercontent.com/GoBeromsu/oms/main/scripts/install.sh | bash -s -- --runtime all --vault /path/to/vault

# Also execute external host CLIs where available, e.g. claude plugin/mcp commands.
curl -fsSL https://raw.githubusercontent.com/GoBeromsu/oms/main/scripts/install.sh | bash -s -- --runtime all --vault /path/to/vault --execute
```

Environment knobs:

| Variable | Meaning |
| --- | --- |
| `OMS_PACKAGE_SPEC` | npm package spec or tarball URL to install globally |
| `OMS_INSTALL_RUNTIME` | `auto`, `all`, `claude`, `codex`, or `hermes` |
| `OMS_VAULT` | vault path used for MCP registration |
| `OMS_EXECUTE_EXTERNAL=1` | allow host CLI commands such as `claude plugin install` |

## CLI install

From a checkout or installed package:

```bash
npm ci
npm run build
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz install --runtime all --vault /path/to/vault --dry-run
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz install --runtime all --vault /path/to/vault --yes
```

Runtime selection follows the Ouroboros pattern:

1. Explicit `--runtime` wins.
2. `auto` detects `claude`, `codex`, and `hermes` on `PATH`.
3. If nothing is detected, `auto` defaults to Claude Code for conservative first-run behavior; use `--runtime all` to install every host surface.
4. `all` installs every known adapter surface.

## What install writes

| Host | Install behavior |
| --- | --- |
| Claude Code | Upserts `~/.claude/mcp.json` entry for `oms`; prints Claude plugin/MCP commands; with `--execute`, runs `claude plugin install` and `claude mcp add` when the CLI is available. |
| Codex | Installs `~/.codex/rules/oms.md`, `~/.codex/skills/oms-*`, copies adapter files to `~/.codex/plugins/oms`, and writes a managed `[mcp_servers.oms]` block plus `OMS_AGENT_RUNTIME=codex` env in `~/.codex/config.toml`. |
| Hermes | Installs `~/.hermes/skills/knowledge-management/oms/`, copies adapter files to `~/.hermes/adapters/oms`, and writes `mcp_servers.oms` in `~/.hermes/config.yaml`. |

All host writes are namespaced under `oms` and are reversible with `oms uninstall`.

## Legacy setup flow

`setup` still adopts a vault into the OMS ontology and can print the Claude Code plan:

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz setup --vault /path/to/vault --yes --install-claude
```

Typical printed commands look like:

```bash
claude plugin install /path/to/oms/adapters/claude-code
claude mcp add oms -- npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz mcp --vault /path/to/vault
```

## Uninstall

Preview first:

```bash
oms uninstall --runtime all --dry-run
```

Remove host registrations and adapter files:

```bash
oms uninstall --runtime all --yes
```

One-line uninstall:

```bash
curl -fsSL https://raw.githubusercontent.com/GoBeromsu/oms/main/scripts/uninstall.sh | bash -s -- --yes
```

The uninstaller removes OMS host registrations and adapter files. It does **not** remove vault notes or `vault/.oms/` ontology data. Pass `--keep-package` to the shell uninstaller if you want to keep the globally installed package.

## Verify the install

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz doctor --vault /path/to/vault
oms install --runtime all --vault /path/to/vault --dry-run
claude plugin validate adapters/claude-code
```

Inside a host runtime, verify the MCP server by listing MCP tools or asking for OMS graph/status. The server exposes status, graph build, axis retrieval, lazy note loading, contract validation, and gated capture tools.
