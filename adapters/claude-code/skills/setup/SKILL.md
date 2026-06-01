---
name: lexa-setup
description: Adopt an existing Obsidian vault into the Lexa convention by running npx lexa setup.
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
npx lexa setup [--vault <path>] [--yes] [--install-claude]
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
| `--install-claude` | Print Claude Code plugin install and MCP registration commands. This is a dry-run; it does not mutate Claude config. Release smoke tests assert the printed plugin path exists inside the npm tarball. |

## Example

```bash
# Interactive (recommended first run):
npx lexa setup --vault ~/Documents/MyVault

# Non-interactive (CI / scripted):
npx lexa setup --vault ~/Documents/MyVault --yes

# Also print Claude Code harness install commands (dry-run):
npx lexa setup --vault ~/Documents/MyVault --yes --install-claude
```

## After setup

Run `/lexa-doctor` to validate your existing notes against the convention.

## Roadmap

Setup and the Claude Code dry-run install plan are real and release-gated by unpacked npm tarball smoke tests. The MCP command starts
the status/read/cache/capture runtime (`lexa_graph_status`, `lexa_graph_build`,
`lexa_list_concepts`, `lexa_retrieve_by_axis`, `lexa_lazy_load_note`,
`lexa_validate_contract`, `lexa_capture_prepare`, `lexa_capture_commit`).
Capture commit is gated by path-safety and contract validation.
