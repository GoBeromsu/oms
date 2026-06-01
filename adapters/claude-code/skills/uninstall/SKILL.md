---
name: lexa-uninstall
description: Remove Lexa host adapter and MCP registrations by running npx @goberomsu/lexa uninstall.
---

# Skill: lexa-uninstall (Claude Code)

Remove Lexa host registrations and adapter files. This does **not** delete vault notes or `vault/.lexa/` ontology data.

## Invocation

```
/lexa-uninstall
```

## What this skill does

Shells out to:

```bash
npx @goberomsu/lexa uninstall [--runtime <all|claude|codex|hermes>] [--dry-run] [--execute] [--yes]
```

## Recommended flow

```bash
# Preview first:
npx @goberomsu/lexa uninstall --runtime all --dry-run

# Remove Lexa host registrations:
npx @goberomsu/lexa uninstall --runtime all --yes
```

Use `--execute` only when you want Lexa to call external host CLIs such as `claude mcp remove lexa` or `claude plugin uninstall lexa`.
