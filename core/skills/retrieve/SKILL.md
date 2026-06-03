---
name: retrieve
description: Retrieve knowledge from the vault through declared Oh My Second Brain lenses (인출).
---

# Skill: retrieve

Surface the right notes and fields for a given purpose using the vault's
declared retrieval lenses.

## What this skill does

1. Identify the **retrieval purpose** from the user's request (e.g. "synthesize this topic", "audit my sources").
2. Match the purpose to a declared **lens** (e.g. `synthesis`, `audit`) on the relevant concept.
3. For each matching note, return only the fields listed in that lens — not all frontmatter.
4. Present results grouped by concept/folder with lens-filtered frontmatter.

## Lenses (인출 뷰)

A lens is a pre-declared named retrieval view, not a query filter.
Each concept declares which fields matter for which purpose:

```yaml
lenses:
  - name: synthesis
    intent: "Surface what was argued and where to find it"
    fields: [title, thesis, source-url]
  - name: audit
    intent: "Check provenance and capture date"
    fields: [title, source-url, captured-at]
```

The retrieval skill reads these declarations from `vault/.oms/concepts/*.yaml`.

## Engine

The retrieval engine is implemented in `src/graph/cache.ts` and exposed via two MCP tools:

- **`oms_retrieve_by_axis`** — filters notes by concept, folder, property, value, or wikilink; ranks results using a lexical BM25-like algorithm; returns up to 50 results.
- **`oms_lazy_load_note`** — fetches the full body of a single note on demand, avoiding loading all note bodies upfront.

There is no vector/embedding layer; retrieval is lexical only. Call `oms_retrieve_by_axis` with the appropriate axis and lens, then use `oms_lazy_load_note` to expand individual results as needed.

## Example agent steps

```
User: "Synthesize my literature notes on transformers"

1. purpose  = synthesis
2. concept  = literature  →  lens = synthesis  →  fields = [title, thesis, source-url]
3. scan     = vault/references/*.md
4. for each note: extract only those three frontmatter fields
5. return a grouped summary with citations
```

## Persona

Use the **retriever** agent persona for this skill (`core/agents/retriever.md`).
