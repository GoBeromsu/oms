---
name: lexa-capture
description: Capture knowledge into the vault under the Lexa convention using gated MCP prepare/commit tools.
---

# Skill: lexa-capture (Claude Code)

Place a piece of knowledge into the vault with correct frontmatter and folder placement.

## Invocation

```
/lexa-capture
```

## What this skill does

Uses MCP `lexa_capture_prepare` first. Only call MCP `lexa_capture_commit`
after prepare returns `ready` or the user has supplied missing fields.

## Agent-guided steps (v0)

1. Identify the **concept** that fits the incoming knowledge (check `vault/.lexa/concepts/`).
2. Resolve the **target folder** from `vault/.lexa/taxonomy.yaml`.
3. Generate a filename: `YYYY-MM-DD-<slug>.md`.
4. Construct frontmatter — fill `required: true` fields; preserve any extra fields.
5. If required fields are missing, ask for them; do not write.
6. If placement is ambiguous, route to inbox.
7. Commit only through `lexa_capture_commit` (`create` or `append`).
8. Shell out: `npx @goberomsu/lexa doctor` (non-blocking, exits 0) to confirm the note is clean.

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

## Runtime

`lexa_capture_prepare` preserves route-to-inbox and ask-missing-fields behavior.
`lexa_capture_commit` refuses unsafe paths, `.lexa/` internals, non-markdown
targets, and frontmatter that violates the resolved concept contract.
