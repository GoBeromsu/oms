# Lexa Convention Shim — Codex

<!-- Append this block to your project's AGENTS.md to activate Lexa conventions in Codex (oh-my-codex). -->

## Vault Convention (Lexa)

This vault is governed by Lexa conventions stored in `.lexa/`.

**Before working with vault notes:**
- Run `npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz doctor` to validate notes against the convention (exits 0, non-blocking).
- Read `.lexa/taxonomy.yaml` and `.lexa/concepts/*.yaml` for folder and field declarations.

**Capture:** Use `$lexa-capture` skill or follow the librarian persona.
**Retrieve:** Use `$lexa-retrieve` skill or follow the retriever persona with declared lenses.

> **v0 native install:** `lxa install --runtime codex` installs Codex rules, `$lexa-*` skills, and a managed Codex MCP config. Use Lexa MCP tools for capture/retrieve and CLI commands for lifecycle.
