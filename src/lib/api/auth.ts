import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { getCurrentUser, type AuthUser } from "@/lib/auth/user";

/** 从 Authorization: Bearer <token> 中提取 token */
export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

export async function getUserByToken(token: string): Promise<AuthUser | null> {
  const session = await getSession(token);
  if (!session) return null;

  const db = getDb();
  const user = db
    .prepare(`SELECT id, email FROM User WHERE id = @id`)
    .get({ id: session.userId }) as { id: string; email: string } | undefined;

  return user ?? null;
}

/**
 * 解析 API 调用者身份：
 * 1. 优先使用 Authorization: Bearer <token>（供 MCP / 程序化调用）
 * 2. 回退到浏览器 session cookie
 */
export async function resolveApiUser(request: Request): Promise<AuthUser | null> {
  const token = extractBearerToken(request);
  if (token) return getUserByToken(token);
  return getCurrentUser();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
