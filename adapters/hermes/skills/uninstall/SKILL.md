---
name: uninstall
description: Remove Oh My Second Brain host adapter files and MCP registration without deleting vault notes or vault ontology.
---

# oms-uninstall

Preview first:

```bash
oms uninstall --runtime all --dry-run
```

Remove host registrations:

```bash
oms uninstall --runtime all --yes
```

Never delete vault notes or `vault/.oms/` as part of host uninstall.
