---
name: oms-setup
description: Adopt an existing Obsidian vault into the OMS convention by running npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz setup.
---

# Skill: oms-setup (Claude Code)

Adopt your Obsidian vault into the OMS convention.
This skill is **REAL in v0** — it shells out to the fully-implemented CLI.

## Invocation

```
/oms-setup
```

## What this skill does

Shells out to:

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz setup [--vault <path>] [--yes] [--install-claude]
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz install [--runtime <auto|all|claude|codex|hermes>] [--vault <path>] [--dry-run] [--execute] [--yes]
```

The CLI will:
1. Scan your vault's existing top-level folders (does NOT impose a structure).
2. Interactively ask the `intent` for each folder (use `--yes` to skip prompts).
3. Write `vault/.oms/taxonomy.yaml` and copy default concept schemas.

## Options

| Flag | Description |
|------|-------------|
| `--vault <path>` | Path to your Obsidian vault root (default: current directory) |
| `--yes` | Non-interactive: accept all defaults, no prompts |
| `--install-claude` | Legacy setup-only dry-run that prints Claude Code plugin install and MCP registration commands. |
| `install --runtime <name>` | Install host adapter/MCP registration for `auto`, `all`, `claude`, `codex`, or `hermes`. |
| `install --dry-run` | Preview host writes without mutating config. |
| `install --execute` | Allow external host CLIs such as `claude plugin install` to run when available. |

## Example

```bash
# Interactive (recommended first run):
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz setup --vault ~/Documents/MyVault

# Non-interactive (CI / scripted):
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz setup --vault ~/Documents/MyVault --yes

# Preview all host adapter installs:
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz install --runtime all --vault ~/Documents/MyVault --dry-run

# Install all host adapter/MCP registrations:
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz install --runtime all --vault ~/Documents/MyVault --yes

# Also run external host CLIs where available:
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz install --runtime claude --vault ~/Documents/MyVault --yes --execute
```

## After setup

Run `/oms-doctor` to validate your existing notes against the convention.

## Roadmap

Setup plus `oms install`/`oms uninstall` host lifecycle commands are real and release-gated by unpacked npm tarball smoke tests. The MCP command starts
the status/read/cache/capture runtime (`oms_graph_status`, `oms_graph_build`,
`oms_list_concepts`, `oms_retrieve_by_axis`, `oms_lazy_load_note`,
`oms_validate_contract`, `oms_capture_prepare`, `oms_capture_commit`).
Capture commit is gated by path-safety and contract validation.
