# MCP server (Claude / ChatGPT / Codex access to scraper data)

The app exposes its tenders / leads / LinkedIn-leads / scrape-jobs data as an [MCP](https://modelcontextprotocol.io)
server at `/api/mcp`, so it deploys with the rest of the app — no separate hosting. It's read-only
and talks straight to Supabase via the existing service-role client (`src/features/mcp/mcp-server.ts`).

Live at: `https://scraper.growthpad.co.ke/api/mcp`

## Tools

- `search_tenders(query?, jobId?, limit?)`
- `get_tender(id)` — full row including raw scraped content
- `search_leads(query?, jobId?, limit?)`
- `search_linkedin_leads(query?, jobId?, limit?)`
- `list_scrape_jobs(limit?)`

## Auth

Two ways in, both checked on every `/api/mcp` request (`src/features/mcp/oauth.ts`):

1. **Static secret** — the `MCP_LOGIN_SECRET` env var, used directly as a Bearer token. Simplest
   path for clients with a plain "paste a token" config field (Claude Desktop, Claude Code, Codex CLI).
2. **OAuth 2.1 + PKCE** — for clients that only support OAuth login (ChatGPT connectors have no
   API-key field). `/api/mcp/register`, `/api/mcp/authorize`, `/api/mcp/token` implement just
   enough of the spec for that: "login" is typing `MCP_LOGIN_SECRET` into a page, which then mints
   a random access token. Client registrations and auth codes are stateless (HMAC-signed, never
   stored); minted access tokens live in the `mcp_access_tokens` table (migration `0022`) since
   Vercel functions don't share memory across requests, and there isn't really a "gets deleted"
   moment for them — they just fall out of `WHERE expires_at > now()` after 12h.

Required env vars (Vercel project settings): `MCP_LOGIN_SECRET` (pick a long random value).
`MCP_PUBLIC_BASE_URL` is optional — only needed if the app is ever reachable at a URL Vercel's
request headers don't already reflect correctly.

## Configuring a client

### Claude Desktop / Claude Code / Codex CLI

These accept a remote MCP server URL + header directly — no OAuth needed:

```json
{
  "mcpServers": {
    "gcg-scraper": {
      "url": "https://scraper.growthpad.co.ke/api/mcp",
      "headers": { "Authorization": "Bearer <MCP_LOGIN_SECRET value>" }
    }
  }
}
```

(Claude Desktop: Settings → Connectors → Add custom connector. Codex CLI: same shape under
`mcp_servers` in `~/.codex/config.toml`, using `url` instead of `command`/`args`.)

### ChatGPT

**Settings → Connectors → Advanced → Developer mode → Add connector**, server URL
`https://scraper.growthpad.co.ke/api/mcp`, auth type OAuth. ChatGPT registers itself, redirects
the user to the `/api/mcp/authorize` login page (enter `MCP_LOGIN_SECRET`), then exchanges the
code for an access token automatically. No token to paste by hand.

## Files

- `src/features/mcp/mcp-server.ts` — tool definitions
- `src/features/mcp/oauth.ts` — auth (static token + OAuth shim)
- `src/app/api/mcp/route.ts` — the MCP endpoint itself
- `src/app/api/mcp/{register,authorize,token}/route.ts` — OAuth endpoints
- `src/app/.well-known/oauth-{authorization-server,protected-resource}/route.ts` — OAuth discovery
- `src/proxy.ts` — these paths are carved out of the app's normal session-cookie auth gate
