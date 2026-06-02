---
name: oms-doctor
description: Validate vault notes against the Oh My Second Brain convention by running oms doctor.
---

# Skill: oms-doctor (Claude Code)

Check every note in your vault against its declared concept schema.
This skill is **REAL in v0** — it shells out to the fully-implemented CLI.

## Invocation

```
/oms-doctor
```

## What this skill does

Shells out to:

```bash
oms doctor [--vault <path>]
```

The CLI will:
1. Load `vault/.oms/` and `vault/.oms/taxonomy.yaml`.
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
oms doctor --vault ~/Documents/MyVault
```

## Sample output

```
vault/references/attention.md
  WARN  title      required  Field "title" is required but missing
  WARN  source-url type      Expected url, got string

Checked 12 notes. 2 violations found. (exits 0)
```

## Roadmap

Doctor is fully real in v0. Run it after any `oms setup`, `oms define`,
or bulk note edit to keep your vault clean.
