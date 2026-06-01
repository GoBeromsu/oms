---
name: lexa-install
description: Install Lexa Codex/Hermes/Claude host adapters and MCP registration.
---

# lexa-install

Use for host lifecycle installation.

```bash
npx @goberomsu/lexa install --runtime <auto|all|claude|codex|hermes> --vault <vault> --yes
```

For Codex, this installs:

- `~/.codex/rules/lexa.md`
- `~/.codex/skills/lexa-*`
- `~/.codex/plugins/lexa`
- managed `[mcp_servers.lexa]` in `~/.codex/config.toml`
