---
name: retrieve
description: Retrieve vault knowledge axis-first using folders, frontmatter, wikilinks, and declared lenses.
---

# lexa-retrieve

Use `lexa_retrieve_by_axis` first. Narrow by concept/folder/property/value/wikilink before lexical query. Use `lexa_lazy_load_note` only after selecting candidate notes.

Return lens-shaped fields where possible; do not dump full note bodies unless the user asks or the retrieval task needs body evidence.
