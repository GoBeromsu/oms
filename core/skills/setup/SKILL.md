---
name: setup
description: Adopt an existing Obsidian vault into the Lexa convention (REAL today).
---

# Skill: setup

Adopt your existing vault into the Lexa convention.
This skill is **REAL in v0** — the CLI command is fully implemented.

## Shell-out

```bash
npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz setup [--vault <path>] [--yes]
```

- `--vault <path>` — path to your Obsidian vault root (default: current directory).
- `--yes` / `LEXA_NON_INTERACTIVE=1` — bypass all prompts and accept defaults (for CI / non-TTY).

## What the command does

1. Resolves the vault root (from `--vault` or `cwd`).
2. Scans existing **top-level folders** in the vault (does NOT impose a structure).
3. For each folder, asks its `intent` (why this knowledge lives here), pre-filling a humanized default.
4. Asks which shipped concept binds to this folder (`literature`, `inbox`, or none).
5. Writes `vault/.lexa/taxonomy.yaml` (with `version: 0`).
6. Copies the shipped default concepts into `vault/.lexa/concepts/`.

After setup, the vault is governed by Lexa conventions.
Run `npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz doctor` at any time to validate existing notes.

## What setup does NOT do

- Does NOT rename, move, or delete any existing notes.
- Does NOT impose a new folder structure.
- Does NOT modify existing frontmatter.

## After setup

Run the `doctor` skill to check your notes against the convention:

```bash
npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz doctor [--vault <path>]
```
