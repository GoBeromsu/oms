# Lexa Conventions Guide

A Lexa convention is **declarative data you own**. It lives in your vault under `vault/.lexa/` and tells host agents what your frontmatter means, not just what keys exist. This guide covers the format, how to grow it, and what Lexa enforces.

## The Convention Format

The convention is a semantic ontology with four interlocking pieces:

- **Concept** — a note-type with an explicit `intent` (what this knowledge is FOR).
- **Field** — one frontmatter key; each field is a single unit of convention, grown incrementally.
- **Lens** — a named retrieval view that selects which fields matter for a specific retrieval purpose.
- **Taxonomy** — binds folders to concepts and declares a per-folder `intent` ("the folder itself is information").

## Worked Example: the `literature` Concept

```yaml
# vault/.lexa/concepts/literature.yaml
concept: literature
intent: >
  Permanent notes on external sources — books, papers, articles.
  Exists to build a stable reference layer that synthesis notes can cite.
folder: references

fields:
  - name: title
    type: string
    required: true
    intent: The canonical title of the source, used as the primary lookup key.

  - name: source-url
    type: url
    required: true
    intent: Canonical URL or DOI so the source can always be re-located.

  - name: author
    type: list
    required: false
    intent: Author(s); list form allows multi-author sorting and filtering.
    normalize: trim

  - name: date-read
    type: date
    required: false
    intent: When you finished reading; used for recency-weighted retrieval.

  - name: status
    type: string
    required: false
    intent: Reading status (e.g. reading, done, abandoned).
    normalize: lower

lenses:
  - name: synthesis
    intent: >
      Surface the fields needed when writing a synthesis note from this source.
      A synthesis lens answer: "what did I learn and where did it come from?"
    fields:
      - title
      - source-url
      - author

  - name: audit
    intent: >
      Surface the fields needed to verify coverage and completeness.
    fields:
      - title
      - source-url
      - date-read
      - status
```

A note in `references/` that uses this concept would open like:

```markdown
---
title: "Thinking, Fast and Slow"
source-url: "https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow"
author: ["Daniel Kahneman"]
date-read: 2024-11-15
status: done
my-rating: 5
---

Body of the note...
```

`my-rating` is not declared in the concept. Lexa leaves it untouched (`additionalProperties: preserve`).

## Field Types

| Type | Example value | Notes |
|------|--------------|-------|
| `string` | `"done"` | Scalar text. |
| `url` | `"https://..."` | Validated to look like a URL. |
| `date` | `2024-11-15` | ISO 8601 date string. |
| `list` | `["a", "b"]` | YAML sequence. |
| `number` | `42` | Integer or float. |
| `boolean` | `true` | YAML boolean. |

## Normalization Rules

A field may declare a `normalize` hint that documents the intended shape of the value:

| Normalize | Meaning |
|-----------|---------|
| `kebab` | Lowercase, spaces replaced with hyphens (e.g. `my-tag`). |
| `lower` | Lowercase only. |
| `trim` | Strip leading/trailing whitespace. |

Normalization in v0 is documented intent, not an automatic transform. `validateFrontmatter` checks the declared type but does not rewrite values.

## How to Add a Field

Each frontmatter key is an independent unit of convention. To add one:

1. Open the concept file in `vault/.lexa/concepts/<concept>.yaml`.
2. Append a new entry under `fields:`.
3. Provide at minimum `name`, `type`, and `intent`. Set `required: true` only for keys that every note in that folder must have.
4. Run `lexa doctor` — it will report any existing notes that are now missing the new required field (as warnings, never blocking).

You never need to add all fields upfront. Start with the two or three that matter for your current retrieval use case and grow the convention over time.

## taxonomy.yaml

The taxonomy binds folders to concepts and gives each folder a declared `intent`. `lexa setup` generates this file by scanning your vault's existing top-level folders — it never imposes a folder structure.

```yaml
# vault/.lexa/taxonomy.yaml
version: 0

folders:
  references:
    intent: >
      Permanent notes on external sources (books, papers, articles).
      The stable substrate that synthesis and evergreen notes cite.
    concept: literature

  notes:
    intent: >
      Evergreen and synthesis notes — ideas that have been processed
      and connected to other knowledge.
    concept: null   # not yet bound to a concept

  inbox:
    intent: >
      Unprocessed captures. Everything here is temporary; the inbox
      is emptied by either promoting a note or deleting it.
    concept: inbox
```

The `concept` value can be:
- A string — the name of a concept YAML file (without `.yaml`).
- `null` — the folder has a declared intent but no concept binding yet.
- A list of strings — multiple concepts coexist in the same folder (rare but valid).

A folder with `concept: null` is still meaningful: its `intent` tells agents what kind of knowledge lives there even without a full field schema.

## Enforcement Semantics

### `onViolation: warn` (non-blocking in v0)

When `validateFrontmatter` finds a violation it returns a `ValidationResult { valid, violations[] }` and **never throws**. The `lexa doctor` command prints a violation summary and always exits 0. This means:

- A missing required field is surfaced as a warning, not an error.
- Agent workflows are never blocked by a convention mismatch.
- You can run `lexa doctor` at any time with zero risk of breaking a build.

### `additionalProperties: preserve`

Frontmatter keys that are not declared in the concept's `fields` array are left completely untouched. Lexa does not emit a violation for them and does not remove them. Your existing Obsidian plugins, templates, and personal keys coexist safely with the declared convention.

### `immutable` (v0 no-op, forward-compatible)

A field may be declared `immutable: true`. In v0 this is recorded in the schema but **never enforced** — no violation is emitted for an immutable field that has changed, because Lexa does not maintain a baseline snapshot to compare against. The union member is kept so that v1 can begin enforcing without a breaking schema change.

## User Ownership

Lexa ships default concepts in `core/ontology/` (inside the npm package). Running `lexa setup` copies them into `vault/.lexa/concepts/` — from that point on, **you own those files**. Lexa enforces whatever you declare; it does not pull updates over the files you have edited.

The separation is:
- `core/ontology/` — Lexa's shipped defaults (read-only from your perspective).
- `vault/.lexa/` — your live convention (user-owned, edited freely, never overwritten by Lexa after setup).

To reset a concept to the shipped default, delete the file in `vault/.lexa/concepts/` and re-run `lexa setup`.
