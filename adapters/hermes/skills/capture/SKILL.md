---
name: capture
description: Capture knowledge into the vault through Lexa's folder/frontmatter contract.
---

# lexa-capture

Use MCP `lexa_capture_prepare` before writing. Commit only with `lexa_capture_commit` after the plan is `ready` or the user provides missing fields.

Rules:

1. Resolve concept from the user-owned ontology.
2. Resolve folder from `vault/.lexa/taxonomy.yaml`.
3. Fill required frontmatter; preserve additional properties.
4. Route ambiguity to inbox.
5. Keep writes inside the vault and Markdown-only.
