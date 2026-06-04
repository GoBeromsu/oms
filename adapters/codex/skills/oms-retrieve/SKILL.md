---
name: oms-retrieve
description: Retrieve vault knowledge axis-first using folders, frontmatter, wikilinks, and declared lenses.
---

# oms-retrieve

Use `oms_retrieve_context` first for natural-language retrieval. It combines live
frontmatter/folder/wikilink graph context with optional qmd lexical/vector
candidates and does not require a warm graph cache. Pass declared
concept/folder/property/value/wikilink axes when the user's intent gives them.

Use `qmdScope: "global"` when the user asks broad semantic search across the
vault, and `qmdScope: "graph"` when qmd candidates must stay inside the selected
OMS graph candidates. Use `oms_retrieve_by_axis` only for legacy axis-first
cache retrieval. Use `oms_lazy_load_note` only after selecting candidate notes.

Return lens-shaped fields where possible; do not dump full note bodies unless the user asks or the retrieval task needs body evidence.
