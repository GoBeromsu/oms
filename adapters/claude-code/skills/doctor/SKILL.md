---
name: lexa-doctor
description: Validate vault notes against the Lexa convention by running npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz doctor.
---

# Skill: lexa-doctor (Claude Code)

Check every note in your vault against its declared concept schema.
This skill is **REAL in v0** — it shells out to the fully-implemented CLI.

## Invocation

```
/lexa-doctor
```

## What this skill does

Shells out to:

```bash
npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz doctor [--vault <path>]
```

The CLI will:
1. Load `vault/.lexa/` and `vault/.lexa/taxonomy.yaml`.
2. Walk every `.md` note in the vault.
3. Resolve each note's concept from the taxonomy folder binding.
4. Validate frontmatter fields against the concept schema.
5. Print per-note violations (field, rule, message) and total counts.
6. **Always exits 0** — v0 is advisory only (`onViolation: warn`).

## Options

| Flag | Description |
|------|-------------|
| `--vault <path>` | Path to your Obsidian vault root (default: current directory) |

## Example

```bash
npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz doctor --vault ~/Documents/MyVault
```

## Sample output

```
vault/references/attention.md
  WARN  title      required  Field "title" is required but missing
  WARN  source-url type      Expected url, got string

Checked 12 notes. 2 violations found. (exits 0)
```

## Roadmap

Doctor is fully real in v0. Run it after any `lxa setup`, `lxa define`,
or bulk note edit to keep your vault clean.
