---
name: lexa-retrieve
description: Retrieve knowledge from the vault through declared Lexa lenses (agent-guided; runtime is roadmap).
---

# Skill: lexa-retrieve (Claude Code)

Surface the right notes and fields for a given purpose using the vault's declared lenses (인출).

## Invocation

```
/lexa-retrieve
```

## What this skill does

Conceptually shells out to:

```bash
npx lexa retrieve
```

**Roadmap note:** The `lexa retrieve` runtime automation is not yet implemented in v0.
Today this skill guides the agent (retriever persona) through the steps manually.

## Agent-guided steps (v0)

1. Clarify the user's **retrieval purpose** (synthesize, audit, plan, review, etc.).
2. Match the purpose to a declared **lens** in `vault/.lexa/concepts/*.yaml`.
3. Scan notes in the concept's folder.
4. For each note, project only the **lens fields** — discard the rest.
5. Return results grouped by concept/folder with lens-filtered frontmatter.

## Example

```
Purpose: "Synthesize my transformer papers"

→ concept: literature
→ lens:    synthesis  (fields: [title, thesis, source-url])
→ scan:    vault/references/*.md
→ output:

| title | thesis | source-url |
|-------|--------|------------|
| Attention Is All You Need | Self-attention replaces recurrence | https://arxiv.org/abs/1706.03762 |
```

## When the runtime ships

`npx lexa retrieve` will call the MCP `retrieve` tool directly,
running the lens projection server-side.
