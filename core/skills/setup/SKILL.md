---
name: setup
description: Adopt an existing Obsidian vault into the Oh My Second Brain convention (REAL today).
---

# Skill: setup

Adopt your existing vault into the Oh My Second Brain convention.
This skill is **REAL in v0** — the CLI command is fully implemented.

## Shell-out

```bash
oms setup [--vault <path>] [--yes]
```

- `--vault <path>` — path to your Obsidian vault root (default: current directory).
- `--yes` / `OMS_NON_INTERACTIVE=1` — bypass all prompts and accept defaults (for CI / non-TTY).

## What the command does

1. Resolves the vault root (from `--vault` or `cwd`).
2. Scans existing **top-level folders** in the vault (does NOT impose a structure).
3. For each folder, asks its `intent` (why this knowledge lives here), pre-filling a humanized default.
4. Asks which shipped concept binds to this folder (`literature`, `inbox`, or none).
5. Writes `vault/.oms/taxonomy.yaml` (with `version: 0`).
6. Copies the shipped default concepts into `vault/.oms/concepts/`.

After setup, the vault is governed by Oh My Second Brain conventions.
Run `oms doctor` at any time to validate existing notes.

## What setup does NOT do

- Does NOT rename, move, or delete any existing notes.
- Does NOT impose a new folder structure.
- Does NOT modify existing frontmatter.

## After setup

Run the `doctor` skill to check your notes against the convention:

```bash
oms doctor [--vault <path>]
```
