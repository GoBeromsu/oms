# OMS for Codex

Use OMS when the user asks to set up, validate, capture into, retrieve from, or inspect an Obsidian/Markdown vault governed by `vault/.oms/`.

## Core rule

OMS is a convention harness, not a content generator. The user owns the ontology in `vault/.oms/`; agents must use the declared folder axis, frontmatter/property axes, wikilinks, and retrieval lenses before reading or writing notes.

## Command mapping

| User intent | Preferred OMS surface |
|---|---|
| adopt a vault | `$oms-setup` or `npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz setup --vault <path>` |
| install host integration | `$oms-install` or `npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz install --runtime codex --vault <path> --yes` |
| uninstall host integration | `$oms-uninstall` or `npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz uninstall --runtime codex --yes` |
| validate notes | `$oms-doctor` or `npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz doctor --vault <path>` |
| capture knowledge | use MCP `oms_capture_prepare` then `oms_capture_commit` |
| retrieve knowledge | use MCP `oms_retrieve_by_axis`, then `oms_lazy_load_note` only when needed |

## Safety

- Never delete vault notes or `vault/.oms/` during uninstall.
- Capture must stay inside the configured vault and target Markdown files only.
- If required frontmatter is missing, ask for it; do not invent user-owned ontology values.
- Route ambiguous captures to inbox when the ontology cannot decide.
