---
name: capture
description: Capture knowledge into the vault under the declared Oh My Second Brain convention.
---

# Skill: capture

Place a piece of knowledge into the vault according to the Oh My Second Brain convention.
The librarian persona governs this action.

## What this skill does

1. Determine the **concept** that best fits the incoming knowledge (literature, inbox, note, etc.).
2. Resolve the **target folder** from `vault/.oms/taxonomy.yaml` — the folder whose declared `intent` matches this knowledge type.
3. Generate a filename that follows the concept's naming rules (default: `YYYY-MM-DD-<slugified-title>.md`).
4. Construct frontmatter from the concept's declared fields:
   - Fill every `required: true` field.
   - Fill optional fields where values are known.
   - Leave undeclared (extra) frontmatter fields untouched (`additionalProperties: preserve`).
5. Write the note body after the frontmatter block.
6. Run `oms doctor` (non-blocking, exits 0) to confirm the new note passes field validation.

## Engine

The capture engine is implemented in `src/capture/safe.ts` and exposed via two MCP tools:

- **`oms_capture_prepare`** — resolves the target path and constructs the proposed frontmatter/body without writing anything. Call this first to let the agent review the proposed note before committing.
- **`oms_capture_commit`** — writes the file to disk. Gated by vault confinement: rejects writes that are outside the vault, to non-`.md` files, or into the `.oms/` config directory. Frontmatter violations are warn-only and do not block the commit.

The recommended agent flow is to call `oms_capture_prepare`, review the result, then call `oms_capture_commit` to finalize.

## Example agent steps

```
User: "Save this paper: 'Attention Is All You Need', arxiv.org/abs/1706.03762"

1. concept = literature  (matches folder: references/)
2. folder  = vault/references/
3. file    = vault/references/2017-06-12-attention-is-all-you-need.md
4. frontmatter:
     title: "Attention Is All You Need"
     source-url: "https://arxiv.org/abs/1706.03762"
     captured-at: "2026-05-31"
5. write note body
6. oms doctor  ← verify (exits 0, non-blocking)
```

## Persona

Use the **librarian** agent persona for this skill (`core/agents/librarian.md`).
