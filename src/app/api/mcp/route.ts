import { NextRequest } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/features/mcp/mcp-server";
import { baseUrl, isLegacyStaticToken, isValidAccessToken } from "@/features/mcp/oauth";

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const header = req.headers.get("authorization");
  if (!header) return false;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return false;
  return isLegacyStaticToken(token) || (await isValidAccessToken(token));
}

function unauthorized(req: NextRequest) {
  return Response.json(
    { error: "Unauthorized" },
    {
      status: 401,
      headers: {
        "www-authenticate": `Bearer resource_metadata="${baseUrl(req)}/.well-known/oauth-protected-resource"`,
      },
    }
  );
}

async function handle(req: NextRequest) {
  if (!(await isAuthorized(req))) return unauthorized(req);

  // Stateless mode: a fresh MCP server + transport per request, nothing persisted
  // server-side between calls — the right shape for a serverless function.
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
