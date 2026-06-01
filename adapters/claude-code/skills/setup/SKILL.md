---
name: lexa-setup
description: Adopt an existing Obsidian vault into the Lexa convention by running npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz setup.
---

# Skill: lexa-setup (Claude Code)

Adopt your Obsidian vault into the Lexa convention.
This skill is **REAL in v0** — it shells out to the fully-implemented CLI.

## Invocation

```
/lexa-setup
```

## What this skill does

Shells out to:

```bash
npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz setup [--vault <path>] [--yes] [--install-claude]
npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz install [--runtime <auto|all|claude|codex|hermes>] [--vault <path>] [--dry-run] [--execute] [--yes]
```

The CLI will:
1. Scan your vault's existing top-level folders (does NOT impose a structure).
2. Interactively ask the `intent` for each folder (use `--yes` to skip prompts).
3. Write `vault/.lexa/taxonomy.yaml` and copy default concept schemas.

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
npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz setup --vault ~/Documents/MyVault

# Non-interactive (CI / scripted):
npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz setup --vault ~/Documents/MyVault --yes

# Preview all host adapter installs:
npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz install --runtime all --vault ~/Documents/MyVault --dry-run

# Install all host adapter/MCP registrations:
npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz install --runtime all --vault ~/Documents/MyVault --yes

# Also run external host CLIs where available:
npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz install --runtime claude --vault ~/Documents/MyVault --yes --execute
```

## After setup

Run `/lexa-doctor` to validate your existing notes against the convention.

## Roadmap

Setup plus `lexa install`/`lexa uninstall` host lifecycle commands are real and release-gated by unpacked npm tarball smoke tests. The MCP command starts
the status/read/cache/capture runtime (`lexa_graph_status`, `lexa_graph_build`,
`lexa_list_concepts`, `lexa_retrieve_by_axis`, `lexa_lazy_load_note`,
`lexa_validate_contract`, `lexa_capture_prepare`, `lexa_capture_commit`).
Capture commit is gated by path-safety and contract validation.
