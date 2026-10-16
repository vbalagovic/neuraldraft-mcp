# Installing the Neural Draft MCP server (for AI agents)

`@neuraldraft/mcp` is a stdio server run with `npx`. Requirements: Node.js 20+.

1. Ask the user for a Neural Draft workspace API key (`ndsk_live_…`). They create it in the Neural Draft admin under **Settings → For developers → API keys**. Never invent a key and never write it to a file that is committed to git.
2. Add this server to the MCP settings file of the client (for Cline: `cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "neuraldraft": {
      "command": "npx",
      "args": ["-y", "@neuraldraft/mcp"],
      "env": { "NEURALDRAFT_API_KEY": "ndsk_live_..." }
    }
  }
}
```

3. Agencies with several client workspaces use `NEURALDRAFT_API_KEYS` instead (`"client-a=ndsk_live_...,client-b=ndsk_live_..."`) and optionally `NEURALDRAFT_WORKSPACE` for the one active at start. The tools `list_workspaces` and `switch_workspace` move between them.
4. Check it works: call `get_brand` (or read the `brand://current` resource). A `401 invalid_api_key` means the key was mistyped or revoked.

No API key wanted? The hosted connector `https://neuraldraft.io/mcp` (Streamable HTTP, OAuth sign-in) needs no key: add it as a remote server and sign in when asked.

Docs: https://docs.neuraldraft.io/mcp/setup
