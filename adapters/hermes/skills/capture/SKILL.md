---
name: capture
description: Capture knowledge into the vault through Oh My Second Brain's folder/frontmatter contract.
---

# oms-capture

Use MCP `oms_capture_prepare` before writing. Commit only with `oms_capture_commit` after the plan is `ready` or the user provides missing fields.

Rules:

1. Resolve concept from the user-owned ontology.
2. Resolve folder from `vault/.oms/taxonomy.yaml`.
3. Fill required frontmatter; preserve additional properties.
4. Route ambiguity to inbox.
5. Keep writes inside the vault and Markdown-only.
