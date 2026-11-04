# Cloudflare agent setup

The official [Cloudflare agent setup](https://developers.cloudflare.com/agent-setup/prompt.md) was applied for the owner's Codex environment. This is machine setup, separate from deploying the product.

## Installed integrations

- Nineteen official skills from `cloudflare/skills`, revision `86505e44f87d801aa1864a3c4109e9a8ae5c409f`, are installed under `%USERPROFILE%\.codex\skills\` using the Codex skill installer.
- The user-level Codex MCP server named `cloudflare` points to `https://mcp.cloudflare.com/mcp`, is enabled and authenticated through OAuth. Cloudflare tools were used successfully on 29 October 2026.
- The existing project-local Wrangler version remains pinned at `4.136.1`. This repository already has Wrangler configuration, so the optional beta `cf` CLI is not needed for its deployment workflow.

The existing user configuration was privately backed up before MCP registration. Unrelated settings were preserved. Tokens, callback URLs, login state and private backups are excluded from source packages; do not copy them into project documentation.

## Verify or reconnect

```powershell
codex mcp list
npx wrangler whoami
```

Wrangler and the MCP server have separate OAuth sessions. A working session for one does not prove the other is authenticated. If reconnecting MCP is necessary, review the requested access on Cloudflare. To request the same Workers-focused scopes:

```powershell
codex mcp login cloudflare --scopes offline_access,user:read,account:read,workers-scripts.read,workers-scripts.edit,workers-scripts.metadata_read,workers-scripts.content_read
``` The setup used account identification and Workers-focused scopes. Never paste provider tokens or passwords into chat.

Newly installed skills become available on a subsequent turn; restart the agent when necessary to load newly registered MCP servers. Both are already available in the verified 29 October session. Follow [deployment](../operations/deployment.md) for account/target validation and release commands; this setup alone neither deploys StudySphere nor approves pilot launch.
