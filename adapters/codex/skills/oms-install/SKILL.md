---
name: oms-install
description: Install OMS Codex/Hermes/Claude host adapters and MCP registration.
---

# oms-install

Use for host lifecycle installation.

```bash
npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.4/oms-0.1.4.tgz install --runtime <auto|all|claude|codex|hermes> --vault <vault> --yes
```

For Codex, this installs:

- `~/.codex/rules/oms.md`
- `~/.codex/skills/oms-*`
- `~/.codex/plugins/oms`
- managed `[mcp_servers.oms]` in `~/.codex/config.toml`
