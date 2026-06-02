---
name: oms-uninstall
description: Remove OMS host adapter files and MCP registration without deleting vault notes or vault ontology.
---

# oms-uninstall

Preview first:

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz uninstall --runtime all --dry-run
```

Remove host registrations:

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz uninstall --runtime all --yes
```

Never delete vault notes or `vault/.oms/` as part of host uninstall.
