---
name: doctor
description: Validate vault notes against the Oh My Second Brain convention and report violations (REAL today).
---

# Skill: doctor

Check every note in your vault against its declared concept schema.
This skill is **REAL in v0** — the CLI command is fully implemented.

## Shell-out

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.5/oms-0.1.5.tgz doctor [--vault <path>]
```

- `--vault <path>` — path to your Obsidian vault root (default: current directory).
- Always **exits 0** in v0 (non-blocking; `onViolation: warn`).

## What the command does

1. Loads `vault/.oms/` and `vault/.oms/taxonomy.yaml`.
2. Walks every `.md` note in the vault.
3. For each note, resolves its **concept** from the taxonomy folder binding.
4. Calls `validateFrontmatter(frontmatter, concept)` and collects `Violation[]`.
5. Prints a per-note summary of violations (field, rule, message).
6. Prints total counts: notes checked, violations found.
7. Exits 0 regardless of violation count (v0 is advisory only).

## Violation rules

| Rule | Description |
|------|-------------|
| `required` | A field declared `required: true` is missing from the note's frontmatter |
| `type` | The field value does not match the declared type |
| `immutable` | Field changed after initial set — **suppressed in v0** (no baseline available) |

Undeclared frontmatter fields are **never** reported as violations
(`additionalProperties: preserve`).

## Recommended usage

Run `npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.5/oms-0.1.5.tgz doctor` after:
- Any `oms setup` run
- Adding a new field via `oms define`
- Bulk-editing notes

Integrate into CI by adding `npx oms doctor --vault ./vault` to your workflow.
It will never fail the build in v0.
