import { cache } from "react";
import { getDb } from "@/lib/db";
import { getSession } from "./session";
import { getSessionCookie, clearSessionCookie } from "./cookies";

export interface AuthUser {
  id: string;
  email: string;
}

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const token = await getSessionCookie();
  if (!token) return null;

  const session = await getSession(token);
  if (!session) {
    await clearSessionCookie();
    return null;
  }

  const db = getDb();
  const user = db
    .prepare(`SELECT id, email FROM User WHERE id = @id`)
    .get({ id: session.userId }) as { id: string; email: string } | undefined;

  if (!user) {
    await clearSessionCookie();
    return null;
  }

  return user;
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}
