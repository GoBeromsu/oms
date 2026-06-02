---
name: lexa-uninstall
description: Remove Lexa host adapter and MCP registrations by running npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz uninstall.
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
npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz uninstall [--runtime <all|claude|codex|hermes>] [--dry-run] [--execute] [--yes]
```

## Recommended flow

```bash
# Preview first:
npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz uninstall --runtime all --dry-run

# Remove Lexa host registrations:
npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz uninstall --runtime all --yes
```

Use `--execute` only when you want Lexa to call external host CLIs such as `claude mcp remove lexa` or `claude plugin uninstall lexa`.
