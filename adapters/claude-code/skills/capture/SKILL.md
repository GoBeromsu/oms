---
name: lexa-capture
description: Capture knowledge into the vault under the Lexa convention (agent-guided; runtime is roadmap).
---

# Skill: lexa-capture (Claude Code)

Place a piece of knowledge into the vault with correct frontmatter and folder placement.

## Invocation

```
/lexa-capture
```

## What this skill does

Conceptually shells out to:

```bash
npx lexa capture
```

**Roadmap note:** The `lexa capture` runtime automation is not yet implemented in v0.
Today this skill guides the agent (librarian persona) through the steps manually.

## Agent-guided steps (v0)

1. Identify the **concept** that fits the incoming knowledge (check `vault/.lexa/concepts/`).
2. Resolve the **target folder** from `vault/.lexa/taxonomy.yaml`.
3. Generate a filename: `YYYY-MM-DD-<slug>.md`.
4. Construct frontmatter — fill `required: true` fields; preserve any extra fields.
5. Write the note to the resolved path.
6. Shell out: `npx lexa doctor` (non-blocking, exits 0) to confirm the note is clean.

## Example

```
Input: "Attention Is All You Need", https://arxiv.org/abs/1706.03762

→ concept:  literature
→ folder:   vault/references/
→ file:     vault/references/2017-06-12-attention-is-all-you-need.md
→ frontmatter:
    title: "Attention Is All You Need"
    source-url: "https://arxiv.org/abs/1706.03762"
    captured-at: "2026-05-31"
```

## When the runtime ships

`npx lexa capture` will call the MCP `capture` tool directly.
The librarian persona's logic will be encoded in the MCP server.
