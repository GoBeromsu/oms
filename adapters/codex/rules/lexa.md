# Lexa for Codex

Use Lexa when the user asks to set up, validate, capture into, retrieve from, or inspect an Obsidian/Markdown vault governed by `vault/.lexa/`.

## Core rule

Lexa is a convention harness, not a content generator. The user owns the ontology in `vault/.lexa/`; agents must use the declared folder axis, frontmatter/property axes, wikilinks, and retrieval lenses before reading or writing notes.

## Command mapping

| User intent | Preferred Lexa surface |
|---|---|
| adopt a vault | `$lexa-setup` or `npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz setup --vault <path>` |
| install host integration | `$lexa-install` or `npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz install --runtime codex --vault <path> --yes` |
| uninstall host integration | `$lexa-uninstall` or `npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz uninstall --runtime codex --yes` |
| validate notes | `$lexa-doctor` or `npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz doctor --vault <path>` |
| capture knowledge | use MCP `lexa_capture_prepare` then `lexa_capture_commit` |
| retrieve knowledge | use MCP `lexa_retrieve_by_axis`, then `lexa_lazy_load_note` only when needed |

## Safety

- Never delete vault notes or `vault/.lexa/` during uninstall.
- Capture must stay inside the configured vault and target Markdown files only.
- If required frontmatter is missing, ask for it; do not invent user-owned ontology values.
- Route ambiguous captures to inbox when the ontology cannot decide.
