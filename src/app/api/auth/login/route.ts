import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { isValidEmail } from "@/lib/api/auth";
import {
  badRequest,
  jsonOk,
  methodNotAllowed,
  readJsonBody,
  unauthorized,
} from "@/lib/api/http";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body) return badRequest("invalid JSON body");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) return badRequest("email and password are required");
  if (!isValidEmail(email)) return badRequest("invalid email format");

  const db = getDb();
  const user = db
    .prepare(`SELECT id, passwordHash FROM User WHERE email = @email`)
    .get({ email }) as { id: string; passwordHash: string } | undefined;

  if (!user) return unauthorized();
  if (!verifyPassword(password, user.passwordHash)) return unauthorized();

  const token = await createSession(user.id);
  const row = db
    .prepare(`SELECT id, email, createdAt FROM User WHERE id = @id`)
    .get({ id: user.id });

  return jsonOk({ token, user: row });
}

export function GET() {
  return methodNotAllowed();
}
