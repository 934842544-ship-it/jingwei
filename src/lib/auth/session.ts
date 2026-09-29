import { randomBytes } from "node:crypto";
import { getDb, cuid, nowIso } from "@/lib/db";

const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60;

export function getSessionMaxAge(): number {
  const env = process.env.SESSION_MAX_AGE;
  if (env) {
    const n = parseInt(env, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_MAX_AGE;
}

export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const token = randomBytes(32).toString("hex");
  const id = cuid();
  const maxAge = getSessionMaxAge();
  const expiresAt = new Date(Date.now() + maxAge * 1000).toISOString();

  db.prepare(
    `INSERT INTO Session (id, userId, token, expiresAt, createdAt)
     VALUES (@id, @userId, @token, @expiresAt, @createdAt)`,
  ).run({ id, userId, token, expiresAt, createdAt: nowIso() });

  return token;
}

export async function getSession(token: string): Promise<{ userId: string } | null> {
  const db = getDb();
  const row = db
    .prepare(`SELECT userId, expiresAt FROM Session WHERE token = @token`)
    .get({ token }) as { userId: string; expiresAt: string } | undefined;

  if (!row) return null;

  const now = new Date();
  const expires = new Date(row.expiresAt);
  if (expires <= now) {
    db.prepare(`DELETE FROM Session WHERE token = @token`).run({ token });
    return null;
  }

  return { userId: row.userId };
}

export async function deleteSession(token: string): Promise<void> {
  const db = getDb();
  db.prepare(`DELETE FROM Session WHERE token = @token`).run({ token });
}

export async function cleanExpiredSessions(): Promise<void> {
  const db = getDb();
  db.prepare(`DELETE FROM Session WHERE expiresAt <= datetime('now')`).run();
}
