---
name: lexa-uninstall
description: Remove Lexa host adapter files and MCP registration without deleting vault notes or vault ontology.
---

# lexa-uninstall

Preview first:

```bash
npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz uninstall --runtime all --dry-run
```

Remove host registrations:

```bash
npx -y https://github.com/GoBeromsu/lexa/releases/download/lexa-v0.1.2/goberomsu-lexa-0.1.2.tgz uninstall --runtime all --yes
```

Never delete vault notes or `vault/.lexa/` as part of host uninstall.
