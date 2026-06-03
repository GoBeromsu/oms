---
title: "Frontmatter contract extraction learnings"
tags: ["oms", "frontmatter", "contract", "obsidian", "metadata", "autoresearch", "v1"]
created: 2026-06-03T10:49:33.814Z
updated: 2026-06-03T10:49:33.814Z
sources: []
links: ["oh-my-second-brain-product-and-release-decisions.md"]
category: convention
confidence: medium
schemaVersion: 1
---

# Frontmatter contract extraction learnings

# Frontmatter contract extraction from Markdown vaults

## Summary

Today’s autoresearch established the implementation boundary for oms v1: frontmatter management should be treated as a user-owned contract extracted primarily from Markdown YAML frontmatter, not as an Obsidian-plugin dependency. Obsidian compatibility can help with type hints, but the durable source of truth is `vault/.oms/taxonomy/*.yaml` plus the user’s actual notes.

## What we learned

- **Frontmatter is a contract surface.** Each declared frontmatter key is a Dimension/axis. Values can be label-pool members with stored intent. Agents should use the contract to choose metadata, then deterministic validation should check it.
- **Markdown frontmatter is enough for v1 inference.** A headless scan can derive field names, observed shapes, coverage, folder distribution, enum candidates, and common core fields without launching Obsidian.
- **Metadata Menu is a design reference, not a dependency.** Its FileClass/field model is useful for thinking about field definitions, value types, allowed values, and folder/tag mappings. oms should not require the plugin.
- **Obsidian API exposes runtime metadata/type access.** `metadataCache`/`CachedMetadata` and frontmatter APIs show that Obsidian itself has typed metadata surfaces. oms may use this as a semantic reference or optional provider for type hints, but v1 should not depend on app runtime.
- **`.obsidian/` is optional evidence only.** Core/plugin configs can contain useful hints such as property type assignments, but can also contain secrets. If used at all, it must be allowlisted, redacted, and converted into derived contract suggestions.
- **v1 scope remains requirement-driven.** Except for optional Obsidian/provider-based type extraction, implementation should follow the Ataraxia “Oh my seondbrain requirement v1” contract: convention-as-data, folder as default axis, frontmatter fields as axes, core/optional tiering, closed vocabulary validation, and qmd owning generic search.

## Implementation implication

Do not build a plugin-integration system first. Build the smallest durable harness:

1. `markdown-frontmatter-provider`: scan notes and summarize observed fields/types/folder distribution.
2. `contract-draft`: propose `.oms/taxonomy/*.yaml` field definitions from observed frontmatter.
3. `doctor`: deterministically validate required/core fields, shapes, and closed label pools.
4. `write`: ensure core fields are filled or block; fill derivable optional fields and normalize when declared.
5. Keep Obsidian type extraction as an optional hint layer, never the contract source of truth.

## Boundary

- Source of truth: Markdown YAML frontmatter, folder path, filename, and explicit user interview/contract edits.
- Not source of truth: Metadata Menu, Dataview, Templater, Linter, `.obsidian` plugin settings.
- qmd remains responsible for general lexical/vector search; oms adds convention/axis/graph retrieval only.

## Related artifacts

- Autoresearch report: `.omx/specs/autoresearch-vault-metadata-contract/report.md`
- Requirement note found by qmd: `15-Work/01-Project/Oh-My-Second-Brain/Oh-my-seondbrain-requirement-v1.md`
- Related wiki: [[oh-my-second-brain-product-and-release-decisions]]

