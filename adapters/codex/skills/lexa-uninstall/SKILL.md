---
name: lexa-uninstall
description: Remove Lexa host adapter files and MCP registration without deleting vault notes or vault ontology.
---

# lexa-uninstall

Preview first:

```bash
npx @goberomsu/lexa uninstall --runtime all --dry-run
```

Remove host registrations:

```bash
npx @goberomsu/lexa uninstall --runtime all --yes
```

Never delete vault notes or `vault/.lexa/` as part of host uninstall.
