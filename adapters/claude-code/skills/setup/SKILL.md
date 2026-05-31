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
npx lexa setup [--vault <path>] [--yes]
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

## Example

```bash
# Interactive (recommended first run):
npx lexa setup --vault ~/Documents/MyVault

# Non-interactive (CI / scripted):
npx lexa setup --vault ~/Documents/MyVault --yes
```

## After setup

Run `/lexa-doctor` to validate your existing notes against the convention.

## Roadmap

Setup is fully real in v0. The `capture` and `retrieve` runtime automation
are agent-guided only until the MCP backbone ships.
