# Lexa for Codex

Use Lexa when the user asks to set up, validate, capture into, retrieve from, or inspect an Obsidian/Markdown vault governed by `vault/.lexa/`.

## Core rule

Lexa is a convention harness, not a content generator. The user owns the ontology in `vault/.lexa/`; agents must use the declared folder axis, frontmatter/property axes, wikilinks, and retrieval lenses before reading or writing notes.

## Command mapping

| User intent | Preferred Lexa surface |
|---|---|
| adopt a vault | `$lexa-setup` or `npx @goberomsu/lexa setup --vault <path>` |
| install host integration | `$lexa-install` or `npx @goberomsu/lexa install --runtime codex --vault <path> --yes` |
| uninstall host integration | `$lexa-uninstall` or `npx @goberomsu/lexa uninstall --runtime codex --yes` |
| validate notes | `$lexa-doctor` or `npx @goberomsu/lexa doctor --vault <path>` |
| capture knowledge | use MCP `lexa_capture_prepare` then `lexa_capture_commit` |
| retrieve knowledge | use MCP `lexa_retrieve_by_axis`, then `lexa_lazy_load_note` only when needed |

## Safety

- Never delete vault notes or `vault/.lexa/` during uninstall.
- Capture must stay inside the configured vault and target Markdown files only.
- If required frontmatter is missing, ask for it; do not invent user-owned ontology values.
- Route ambiguous captures to inbox when the ontology cannot decide.
