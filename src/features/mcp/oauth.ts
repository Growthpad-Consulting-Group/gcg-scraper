import { randomBytes, createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

// Minimal OAuth 2.1 + PKCE authorization-code shim, just so ChatGPT's connector UI (which only
// speaks OAuth, no raw API-key field) can complete a login. There's no real user database behind
// it — "login" just means typing the shared MCP_LOGIN_SECRET into the form. Once that succeeds,
// we mint a random access token and that's what gets checked on every /api/mcp call.
//
// This runs on Vercel, where nothing in memory survives between requests, so:
// - client registrations and auth codes are stateless: self-contained signed strings (HMAC),
//   verified on read, never stored. They're only ever used seconds after being issued.
// - access tokens DO need to persist across many later requests over their lifetime, so those
//   live in the `mcp_access_tokens` Supabase table (see migration 0022).

const LOGIN_SECRET = process.env.MCP_LOGIN_SECRET;
const ACCESS_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5min

function requireLoginSecret(): string {
  if (!LOGIN_SECRET) {
    throw new Error("Missing MCP_LOGIN_SECRET env var — set it to whatever secret gates the /api/mcp/authorize login form.");
  }
  return LOGIN_SECRET;
}

function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function sign(payload: object, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify<T>(token: string, secret: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

type ClientPayload = { redirectUris: string[] };
type AuthCodePayload = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: "S256" | "plain";
  exp: number;
};

export function baseUrl(req: Request): string {
  if (process.env.MCP_PUBLIC_BASE_URL) return process.env.MCP_PUBLIC_BASE_URL.replace(/\/$/, "");
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

export async function registerClient(req: Request): Promise<Response> {
  let body: { redirect_uris?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_client_metadata" }, { status: 400 });
  }
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (redirectUris.length === 0) return Response.json({ error: "invalid_redirect_uri" }, { status: 400 });

  const secret = requireLoginSecret();
  const clientId = sign({ redirectUris } satisfies ClientPayload, secret);

  return Response.json(
    {
      client_id: clientId,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    },
    { status: 201 }
  );
}

function loginPage(queryString: string, error?: string) {
  return `<!doctype html>
<html><head><title>GCG Scraper — Sign in</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: system-ui, sans-serif; background: #0b0d10; color: #e5e7eb; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
  form { background: #16191d; padding: 2rem; border-radius: 12px; width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
  h1 { font-size: 1.1rem; margin: 0 0 1rem; }
  input { width: 100%; padding: 0.6rem; margin-bottom: 1rem; border-radius: 8px; border: 1px solid #333; background: #0b0d10; color: #e5e7eb; box-sizing: border-box; }
  button { width: 100%; padding: 0.6rem; border-radius: 8px; border: none; background: #4f46e5; color: white; font-weight: 600; cursor: pointer; }
  .error { color: #f87171; font-size: 0.85rem; margin-bottom: 1rem; }
</style></head>
<body>
  <form method="POST" action="/api/mcp/authorize?${queryString}">
    <h1>Connect to GCG Scraper</h1>
    ${error ? `<div class="error">${error}</div>` : ""}
    <input type="password" name="secret" placeholder="Access secret" autofocus required />
    <button type="submit">Authorize</button>
  </form>
</body></html>`;
}

function html(body: string, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html" } });
}

export async function authorizeGet(req: Request): Promise<Response> {
  const url = new URL(req.url);
  return html(loginPage(url.searchParams.toString()));
}

export async function authorizePost(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const params = url.searchParams;
  const secret = requireLoginSecret();

  const form = new URLSearchParams(await req.text());
  const enteredSecret = form.get("secret") ?? "";

  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state") ?? "";
  const codeChallenge = params.get("code_challenge") ?? "";
  const codeChallengeMethod = (params.get("code_challenge_method") as "S256" | "plain") ?? "plain";

  const client = verify<ClientPayload>(clientId, secret);
  if (!client || !client.redirectUris.includes(redirectUri)) {
    return new Response("Unknown client or redirect_uri", { status: 400 });
  }

  const a = Buffer.from(enteredSecret);
  const b = Buffer.from(secret);
  const secretOk = a.length === b.length && timingSafeEqual(a, b);
  if (!secretOk) {
    return html(loginPage(params.toString(), "Incorrect secret"));
  }

  const code = sign(
    {
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      exp: Date.now() + AUTH_CODE_TTL_MS,
    } satisfies AuthCodePayload,
    secret
  );

  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);
  return Response.redirect(redirect.toString(), 302);
}

function verifyPkce(verifier: string, challenge: string, method: "S256" | "plain"): boolean {
  if (!challenge) return true; // client didn't use PKCE
  if (method === "plain") return verifier === challenge;
  const hash = createHash("sha256").update(verifier).digest("base64url");
  return hash === challenge;
}

export async function issueToken(req: Request): Promise<Response> {
  const secret = requireLoginSecret();
  const contentType = req.headers.get("content-type") ?? "";
  const raw = await req.text();
  const form = contentType.includes("application/json") ? JSON.parse(raw || "{}") : Object.fromEntries(new URLSearchParams(raw));

  if (form.grant_type !== "authorization_code") {
    return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
  }

  const entry = verify<AuthCodePayload>(form.code ?? "", secret);
  if (!entry || entry.exp < Date.now()) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }
  if (entry.redirectUri !== form.redirect_uri || entry.clientId !== form.client_id) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }
  if (!verifyPkce(form.code_verifier ?? "", entry.codeChallenge, entry.codeChallengeMethod)) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }

  const accessToken = newToken();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("mcp_access_tokens")
    .insert({ token: accessToken, expires_at: new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString() });
  if (error) return Response.json({ error: "server_error" }, { status: 500 });

  return Response.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
  });
}

export async function isValidAccessToken(token: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("mcp_access_tokens").select("expires_at").eq("token", token).maybeSingle();
  if (!data) return false;
  return new Date(data.expires_at).getTime() > Date.now();
}

export function isLegacyStaticToken(token: string): boolean {
  const secret = requireLoginSecret();
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authorizationServerMetadata(req: Request) {
  const base = baseUrl(req);
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/mcp/authorize`,
    token_endpoint: `${base}/api/mcp/token`,
    registration_endpoint: `${base}/api/mcp/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256", "plain"],
    token_endpoint_auth_methods_supported: ["none"],
  };
}

export function protectedResourceMetadata(req: Request) {
  const base = baseUrl(req);
  return {
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
  };
}
