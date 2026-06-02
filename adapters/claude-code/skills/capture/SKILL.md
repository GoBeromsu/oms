---
name: oms-capture
description: Capture knowledge into the vault under the Oh My Second Brain convention using gated MCP prepare/commit tools.
---

# Skill: oms-capture (Claude Code)

Place a piece of knowledge into the vault with correct frontmatter and folder placement.

## Invocation

```
/oms-capture
```

## What this skill does

Uses MCP `oms_capture_prepare` first. Only call MCP `oms_capture_commit`
after prepare returns `ready` or the user has supplied missing fields.

## Agent-guided steps (v0)

1. Identify the **concept** that fits the incoming knowledge (check `vault/.oms/concepts/`).
2. Resolve the **target folder** from `vault/.oms/taxonomy.yaml`.
3. Generate a filename: `YYYY-MM-DD-<slug>.md`.
4. Construct frontmatter — fill `required: true` fields; preserve any extra fields.
5. If required fields are missing, ask for them; do not write.
6. If placement is ambiguous, route to inbox.
7. Commit only through `oms_capture_commit` (`create` or `append`).
8. Shell out: `npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.5/oms-0.1.5.tgz doctor` (non-blocking, exits 0) to confirm the note is clean.

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

`oms_capture_prepare` preserves route-to-inbox and ask-missing-fields behavior.
`oms_capture_commit` refuses unsafe paths, `.oms/` internals, non-markdown
targets, and frontmatter that violates the resolved concept contract.
