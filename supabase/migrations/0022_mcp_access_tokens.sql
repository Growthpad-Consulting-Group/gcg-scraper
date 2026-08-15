-- Access tokens minted by the MCP OAuth shim (src/features/mcp) for ChatGPT's connector flow.
-- Vercel functions don't share in-memory state across invocations, so tokens have to live here
-- instead of a process-local map. Client registration and auth codes stay stateless (signed,
-- short-lived, no DB round trip) since they're only ever used once, seconds after being issued.
create table if not exists mcp_access_tokens (
  token text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists mcp_access_tokens_expires_at_idx on mcp_access_tokens (expires_at);
