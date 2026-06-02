---
name: uninstall
description: Remove Lexa host adapter files and MCP registration without deleting vault notes or vault ontology.
---

# lexa-uninstall

Preview first:

```bash
npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz uninstall --runtime all --dry-run
```

Remove host registrations:

```bash
npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz uninstall --runtime all --yes
```

Never delete vault notes or `vault/.lexa/` as part of host uninstall.
