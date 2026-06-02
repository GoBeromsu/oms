---
name: oms-define
description: Grow the vault convention by adding a metadata field to a concept. Entry point is npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz define (roadmap).
---

# Skill: oms-define (Claude Code)

Extend your vault convention field-by-field.
Each frontmatter key is a unit of convention with a declared `intent`, type, and rules.

## Invocation

```
/oms-define
```

## What this skill does

Intended to shell out to:

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz define
```

**Roadmap note:** The `oms define` interactive runtime is not yet implemented in v0.
Today this skill guides you through the same steps manually (agent-guided).

## Agent-guided steps (v0)

1. Identify which **concept** to extend (e.g. `literature`, `inbox`).
2. Choose a new **field name** (snake-case, e.g. `thesis`).
3. State the field's **intent** — why this knowledge matters.
4. Choose **type**: `string` | `string[]` | `date` | `url` | `boolean`.
5. Choose **required**: yes / no.
6. Optionally set **normalize** (e.g. `lowercase`) or **immutable** (lock after creation).
7. Append the entry to `vault/.oms/concepts/<concept>.yaml`.
8. Run `npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz doctor` to validate existing notes against the updated schema.

## YAML snippet to append

```yaml
fields:
  - name: thesis
    type: string
    required: false
    intent: "The central claim this source makes"
```

## When the runtime ships

`npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz define` will run the same Q&A interactively and write the YAML for you.
