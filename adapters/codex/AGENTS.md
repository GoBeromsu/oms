# Lexa Convention Shim — Codex

<!-- Append this block to your project's AGENTS.md to activate Lexa conventions in Codex (oh-my-codex). -->

## Vault Convention (Lexa)

This vault is governed by Lexa conventions stored in `.lexa/`.

**Before working with vault notes:**
- Run `npx lexa doctor` to validate notes against the convention (exits 0, non-blocking).
- Read `.lexa/taxonomy.yaml` and `.lexa/concepts/*.yaml` for folder and field declarations.

**Capture:** Use `$lexa-capture` skill or follow the librarian persona.
**Retrieve:** Use `$lexa-retrieve` skill or follow the retriever persona with declared lenses.

> **v0 stub:** The Codex adapter plugin manifest is a stub. Skills are not yet wired into Codex.
> Use the Lexa MCP server (roadmap) or agent-guided workflows until the Codex adapter ships.
