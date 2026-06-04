---
name: oms-retrieve
description: Retrieve knowledge from the vault through declared Oh My Second Brain retrieval views and axes (agent-guided; runtime is roadmap).
---

# Skill: oms-retrieve (Claude Code)

Surface the right notes and fields for a given purpose using the vault's declared retrieval axes and views (인출).

## Invocation

```
/oms-retrieve
```

## What this skill does

Conceptually shells out to:

```bash
oms retrieve
```

**Runtime note:** Retrieval is available through MCP tools. Prefer
`oms_retrieve_context` for live graph + qmd context retrieval, then
`oms_lazy_load_note` after selecting candidate notes. `oms_retrieve_by_axis`
remains available for legacy cache-backed axis retrieval.

## Agent-guided steps (v0)

1. Clarify the user's **retrieval purpose** (synthesize, audit, plan, review, etc.).
2. Narrow by declared **folder/concept/property/wikilink axes** where possible.
3. Match the purpose to a declared **retrieval view** (`lenses` in YAML) in `vault/.oms/concepts/*.yaml`.
4. Call MCP `oms_retrieve_context` with the best available axes and query.
5. Use default `qmdScope: "global"` for broad semantic search; use
   `qmdScope: "graph"` only when qmd must stay inside the selected graph
   candidates.
6. For each note, return the retrieval-view fields and lazy-load body only when needed.
7. Return results grouped by concept/folder with retrieval-view frontmatter.

## Example

```
Purpose: "Synthesize my transformer papers"

→ concept: literature
→ view:    synthesis  (YAML key: lenses; fields: [title, thesis, source-url])
→ scan:    vault/references/*.md
→ output:

| title | thesis | source-url |
|-------|--------|------------|
| Attention Is All You Need | Self-attention replaces recurrence | https://arxiv.org/abs/1706.03762 |
```

## Runtime

Use MCP `oms_retrieve_context` for live graph/qmd retrieval. Use MCP
`oms_retrieve_by_axis` only for legacy axis-first cache retrieval. Use MCP
`oms_lazy_load_note` only after selecting candidate notes.
