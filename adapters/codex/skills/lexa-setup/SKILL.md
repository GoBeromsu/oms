---
name: lexa-setup
description: Adopt an Obsidian markdown vault into the Lexa convention and optionally install host MCP integration.
---

# lexa-setup

Use when the user wants to initialize Lexa for a vault.

Run:

```bash
npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz setup --vault <vault> --yes
```

Then, when host registration is desired:

```bash
npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz install --runtime codex --vault <vault> --yes
```

Do not modify vault notes during setup. Lexa writes only `vault/.lexa/taxonomy.yaml` and `vault/.lexa/concepts/`.
