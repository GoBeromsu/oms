# OMS Convention Shim — Hermes

<!-- Add this as a context file in your Hermes session to activate OMS conventions. -->

## Vault Convention (OMS)

This vault is governed by OMS conventions stored in `.oms/`.

**Before working with vault notes:**
- Run `npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz doctor` to validate notes against the convention (exits 0, non-blocking).
- Read `.oms/taxonomy.yaml` for folder-to-concept bindings.
- Read `.oms/concepts/*.yaml` for field declarations and lenses.

**Capture:** Follow the librarian persona — resolve concept, resolve folder from taxonomy,
construct required frontmatter, write note, then run `npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz doctor`.

**Retrieve:** Follow the retriever persona — identify purpose, match lens, project lens fields only.

> **v0 native install:** `oms install --runtime hermes` installs a Hermes skill bundle and registers OMS MCP in `~/.hermes/config.yaml`. Use OMS MCP tools for capture/retrieve and CLI commands for lifecycle.
