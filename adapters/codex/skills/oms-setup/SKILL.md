---
name: oms-setup
description: Adopt an Obsidian markdown vault into the Oh My Second Brain convention and optionally install host MCP integration.
---

# oms-setup

Use when the user wants to initialize Oh My Second Brain for a vault.

Run:

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.5/oms-0.1.5.tgz setup --vault <vault> --yes
```

Then, when host registration is desired:

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.5/oms-0.1.5.tgz install --runtime codex --vault <vault> --yes
```

Do not modify vault notes during setup. Oh My Second Brain writes only `vault/.oms/taxonomy.yaml` and `vault/.oms/concepts/`.
