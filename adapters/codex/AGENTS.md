# OMS Convention Shim — Codex

<!-- Append this block to your project's AGENTS.md to activate OMS conventions in Codex (oh-my-codex). -->

## Vault Convention (OMS)

This vault is governed by OMS conventions stored in `.oms/`.

**Before working with vault notes:**
- Run `npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz doctor` to validate notes against the convention (exits 0, non-blocking).
- Read `.oms/taxonomy.yaml` and `.oms/concepts/*.yaml` for folder and field declarations.

**Capture:** Use `$oms-capture` skill or follow the librarian persona.
**Retrieve:** Use `$oms-retrieve` skill or follow the retriever persona with declared lenses.

> **v0 native install:** `oms install --runtime codex` installs Codex rules, `$oms-*` skills, and a managed Codex MCP config. Use OMS MCP tools for capture/retrieve and CLI commands for lifecycle.
