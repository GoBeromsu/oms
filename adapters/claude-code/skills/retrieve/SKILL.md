---
name: oms-retrieve
description: Retrieve knowledge from the vault through declared OMS retrieval views and axes (agent-guided; runtime is roadmap).
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
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz retrieve
```

**Runtime note:** Retrieval is available through MCP tools (`oms_retrieve_by_axis`
and `oms_lazy_load_note`). This skill still guides the agent on intent and
output shaping.

## Agent-guided steps (v0)

1. Clarify the user's **retrieval purpose** (synthesize, audit, plan, review, etc.).
2. Narrow by declared **folder/concept/property/wikilink axes** where possible.
3. Match the purpose to a declared **retrieval view** (`lenses` in YAML) in `vault/.oms/concepts/*.yaml`.
4. Scan notes in the candidate concept/folder set.
5. For each note, return the retrieval-view fields and lazy-load body only when needed.
6. Return results grouped by concept/folder with retrieval-view frontmatter.

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

Use MCP `oms_retrieve_by_axis` for axis-first narrowing and optional lexical
ranking. Use MCP `oms_lazy_load_note` only after selecting candidate notes.
