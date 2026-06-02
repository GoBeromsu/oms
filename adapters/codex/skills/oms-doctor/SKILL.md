---
name: oms-doctor
description: Validate vault notes against the active OMS ontology.
---

# oms-doctor

Run:

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz doctor --vault <vault>
```

The command is advisory in v0 and exits 0 even when warnings are found.
