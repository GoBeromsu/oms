---
name: lexa-setup
description: Adopt an Obsidian markdown vault into the Lexa convention and optionally install host MCP integration.
---

# lexa-setup

Use when the user wants to initialize Lexa for a vault.

Run:

```bash
npx @goberomsu/lexa setup --vault <vault> --yes
```

Then, when host registration is desired:

```bash
npx @goberomsu/lexa install --runtime codex --vault <vault> --yes
```

Do not modify vault notes during setup. Lexa writes only `vault/.lexa/taxonomy.yaml` and `vault/.lexa/concepts/`.
