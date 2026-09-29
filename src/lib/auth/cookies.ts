import { cookies } from "next/headers";
import { getSessionMaxAge } from "./session";

const DEFAULT_COOKIE_NAME = "session";

export function getCookieName(): string {
  return process.env.SESSION_COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

export async function setSessionCookie(token: string): Promise<void> {
  const name = getCookieName();
  const maxAge = getSessionMaxAge();
  const cookieStore = await cookies();
  cookieStore.set(name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const name = getCookieName();
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  const name = getCookieName();
  const cookieStore = await cookies();
  cookieStore.delete(name);
}
