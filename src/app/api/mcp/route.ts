import { resolveApiUser, extractBearerToken, getUserByToken } from "@/lib/api/auth";
import { badRequest, methodNotAllowed, unauthorized } from "@/lib/api/http";
import { MCP_TOOLS, MCP_TOOL_HANDLERS } from "@/lib/mcp/tools";

const SERVER_INFO = {
  name: "task-manager",
  version: "1.0.0",
};

const PROTOCOL_VERSION = "2024-11-05";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return unauthorized();

  const token = extractBearerToken(request);
  if (!token) return unauthorized();

  const user = await getUserByToken(token);
  if (!user) return unauthorized();

  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid JSON body");
  }

  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return badRequest("invalid JSON-RPC request");
  }

  const result = await handleRpc(user.id, body);
  return Response.json({
    jsonrpc: "2.0" as const,
    id: body.id,
    ...result,
  });
}

export function GET() {
  return methodNotAllowed();
}

async function handleRpc(
  userId: string,
  req: JsonRpcRequest,
): Promise<{ result?: unknown; error?: { code: number; message: string; data?: unknown } }> {
  switch (req.method) {
    case "initialize":
      return {
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: {},
          },
          serverInfo: SERVER_INFO,
        },
      };

    case "tools/list":
      return {
        result: {
          tools: MCP_TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      };

    case "tools/call": {
      const params = req.params ?? {};
      const name = typeof params.name === "string" ? params.name : "";
      const args =
        params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments)
          ? (params.arguments as Record<string, unknown>)
          : {};

      const handler = MCP_TOOL_HANDLERS[name];
      if (!handler) {
        return {
          error: {
            code: -32601,
            message: `Unknown tool: ${name}`,
          },
        };
      }

      try {
        const result = await handler(userId, args);
        return { result };
      } catch (err) {
        return {
          error: {
            code: -32000,
            message: err instanceof Error ? err.message : String(err),
          },
        };
      }
    }

    default:
      return {
        error: {
          code: -32601,
          message: `Unknown method: ${req.method}`,
        },
      };
  }
}

// 避免 tree-shake 掉 resolveApiUser（文档用途）
void resolveApiUser;
