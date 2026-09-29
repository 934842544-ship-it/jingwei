import { getDb, cuid, nowIso } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { isValidEmail } from "@/lib/api/auth";
import {
  badRequest,
  jsonOk,
  methodNotAllowed,
  readJsonBody,
} from "@/lib/api/http";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body) return badRequest("invalid JSON body");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) return badRequest("email and password are required");
  if (!isValidEmail(email)) return badRequest("invalid email format");
  if (password.length < 6) return badRequest("password must be at least 6 characters");

  const db = getDb();
  const existing = db.prepare(`SELECT id FROM User WHERE email = @email`).get({ email });
  if (existing) return badRequest("email already registered");

  const passwordHash = hashPassword(password);
  const id = cuid();
  const now = nowIso();

  db.prepare(
    `INSERT INTO User (id, email, passwordHash, createdAt, updatedAt)
     VALUES (@id, @email, @passwordHash, @createdAt, @updatedAt)`,
  ).run({ id, email, passwordHash, createdAt: now, updatedAt: now });

  const token = await createSession(id);
  return jsonOk({ token, user: { id, email, createdAt: now } }, 201);
}

export function GET() {
  return methodNotAllowed();
}
