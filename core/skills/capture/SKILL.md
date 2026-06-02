---
name: capture
description: Capture knowledge into the vault under the declared Lexa convention.
---

# Skill: capture

Place a piece of knowledge into the vault according to the Lexa convention.
The librarian persona governs this action.

## What this skill does

1. Determine the **concept** that best fits the incoming knowledge (literature, inbox, note, etc.).
2. Resolve the **target folder** from `vault/.lexa/taxonomy.yaml` — the folder whose declared `intent` matches this knowledge type.
3. Generate a filename that follows the concept's naming rules (default: `YYYY-MM-DD-<slugified-title>.md`).
4. Construct frontmatter from the concept's declared fields:
   - Fill every `required: true` field.
   - Fill optional fields where values are known.
   - Leave undeclared (extra) frontmatter fields untouched (`additionalProperties: preserve`).
5. Write the note body after the frontmatter block.
6. Run `npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz doctor` (non-blocking, exits 0) to confirm the new note passes field validation.

## Conceptual shell-out (roadmap — NOT wired in v0)

The runtime automation described above is **agent-guidance only in v0**.
No capture engine exists yet; the agent follows these steps manually.
When the MCP server is wired (`src/mcp/server.ts` → real), `capture` will call
the `capture` MCP tool directly.

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
6. npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz doctor  ← verify (exits 0, non-blocking)
```

## Persona

Use the **librarian** agent persona for this skill (`core/agents/librarian.md`).
