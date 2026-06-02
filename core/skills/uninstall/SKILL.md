---
name: oms-uninstall
description: Remove OMS host adapter and MCP registrations by running npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz uninstall.
---

# Skill: oms-uninstall (Claude Code)

Remove OMS host registrations and adapter files. This does **not** delete vault notes or `vault/.oms/` ontology data.

## Invocation

```
/oms-uninstall
```

## What this skill does

Shells out to:

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz uninstall [--runtime <all|claude|codex|hermes>] [--dry-run] [--execute] [--yes]
```

## Recommended flow

```bash
# Preview first:
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz uninstall --runtime all --dry-run

# Remove OMS host registrations:
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz uninstall --runtime all --yes
```

Use `--execute` only when you want OMS to call external host CLIs such as `claude mcp remove oms` or `claude plugin uninstall oms`.
