"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, cuid, nowIso } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import {
  setSessionCookie,
  clearSessionCookie,
  getSessionCookie,
} from "@/lib/auth/cookies";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function login(formData: FormData): Promise<void> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=invalid");
  }
  if (!isValidEmail(email)) {
    redirect("/login?error=invalid");
  }

  const db = getDb();
  const user = db
    .prepare(`SELECT id, passwordHash FROM User WHERE email = @email`)
    .get({ email }) as { id: string; passwordHash: string } | undefined;

  if (!user) {
    redirect("/login?error=invalid");
  }

  const valid = verifyPassword(password, user.passwordHash);
  if (!valid) {
    redirect("/login?error=invalid");
  }

  const token = await createSession(user.id);
  await setSessionCookie(token);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function register(formData: FormData): Promise<void> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!email || !password || !confirmPassword) {
    redirect("/register?error=fields");
  }
  if (!isValidEmail(email)) {
    redirect("/register?error=email");
  }
  if (password.length < 6) {
    redirect("/register?error=password");
  }
  if (password !== confirmPassword) {
    redirect("/register?error=match");
  }

  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM User WHERE email = @email`)
    .get({ email });
  if (existing) {
    redirect("/register?error=exists");
  }

  const passwordHash = hashPassword(password);
  const id = cuid();
  const now = nowIso();

  db.prepare(
    `INSERT INTO User (id, email, passwordHash, createdAt, updatedAt)
     VALUES (@id, @email, @passwordHash, @createdAt, @updatedAt)`,
  ).run({ id, email, passwordHash, createdAt: now, updatedAt: now });

  const token = await createSession(id);
  await setSessionCookie(token);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout(): Promise<void> {
  const token = await getSessionCookie();
  if (token) {
    await deleteSession(token);
  }
  await clearSessionCookie();
  revalidatePath("/", "layout");
  redirect("/login");
}
