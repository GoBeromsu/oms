---
name: define
description: Grow the vault convention by adding or editing a metadata field on a concept.
---

# Skill: define

Extend your OMS convention field-by-field.
Each frontmatter key is a **unit of convention**: it carries a declared `intent`,
type, and optional rules (`required`, `normalize`, `immutable`).

## Entry point

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz define
```

This is the intended user-facing command (roadmap: interactive runtime not built yet).
In v0, `setup` and `doctor` are the REAL CLI commands today.
Use `define` as **agent-guided convention editing** until the interactive runtime ships.

## What this skill does (agent-guided, v0)

1. Ask the user: which **concept** are they extending? (e.g. `literature`, `inbox`)
2. Ask: what is the new **field name**? (snake-case, e.g. `thesis`)
3. Ask: what is this field's **intent** — why does this knowledge live here?
4. Ask: **type** (`string` | `string[]` | `date` | `url` | `boolean`), **required** (yes/no).
5. Optionally ask: `normalize` (e.g. `lowercase`), `immutable` (lock after creation).
6. Open `vault/.oms/concepts/<concept>.yaml` and append the new field entry.
7. Run `npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz doctor` to validate existing notes against the updated schema (exits 0).

## Convention YAML shape (one field entry)

```yaml
fields:
  - name: thesis
    type: string
    required: false
    intent: "The central claim this source makes"
```

## Growing lenses

After adding a field, consider whether it belongs in an existing lens (`synthesis`, `audit`)
or warrants a new lens. Edit the `lenses:` block in the same concept YAML.

## Where the convention lives

All convention data is **user-owned** at `vault/.oms/`:
```
vault/.oms/
  concepts/
    literature.yaml
    inbox.yaml
  taxonomy.yaml
```

OMS ships defaults (from `core/ontology/`); `oms setup` copies them into the vault.
The user then edits them at will — OMS only enforces, never overwrites.
