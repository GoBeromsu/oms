---
name: install
description: Install Oh My Second Brain Codex/Hermes/Claude host adapters and MCP registration.
---

# oms-install

Use for host lifecycle installation.

```bash
oms install --runtime <auto|all|claude|codex|hermes> --vault <vault> --yes
```

For Codex, this installs:

- `~/.codex/rules/oms.md`
- `~/.codex/skills/oms-*`
- `~/.codex/plugins/oms`
- managed `[mcp_servers.oms]` in `~/.codex/config.toml`
