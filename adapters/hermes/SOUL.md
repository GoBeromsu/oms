# Lexa Convention Shim — Hermes

<!-- Add this as a context file in your Hermes session to activate Lexa conventions. -->

## Vault Convention (Lexa)

This vault is governed by Lexa conventions stored in `.lexa/`.

**Before working with vault notes:**
- Run `npx @goberomsu/lexa doctor` to validate notes against the convention (exits 0, non-blocking).
- Read `.lexa/taxonomy.yaml` for folder-to-concept bindings.
- Read `.lexa/concepts/*.yaml` for field declarations and lenses.

**Capture:** Follow the librarian persona — resolve concept, resolve folder from taxonomy,
construct required frontmatter, write note, then run `npx @goberomsu/lexa doctor`.

**Retrieve:** Follow the retriever persona — identify purpose, match lens, project lens fields only.

> **v0 native install:** `lexa install --runtime hermes` installs a Hermes skill bundle and registers Lexa MCP in `~/.hermes/config.yaml`. Use Lexa MCP tools for capture/retrieve and CLI commands for lifecycle.
