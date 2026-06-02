---
name: install
description: Install Lexa Codex/Hermes/Claude host adapters and MCP registration.
---

# lexa-install

Use for host lifecycle installation.

```bash
npx -y https://github.com/GoBeromsu/lexa/releases/download/lxa-v0.1.3/lxa-vault-0.1.3.tgz install --runtime <auto|all|claude|codex|hermes> --vault <vault> --yes
```

For Codex, this installs:

- `~/.codex/rules/lexa.md`
- `~/.codex/skills/lexa-*`
- `~/.codex/plugins/lexa`
- managed `[mcp_servers.lexa]` in `~/.codex/config.toml`
