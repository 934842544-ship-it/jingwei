import { resolveApiUser } from "@/lib/api/auth";
import { jsonOk, methodNotAllowed, unauthorized } from "@/lib/api/http";

export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();
  return jsonOk({ user });
}

export function POST() {
  return methodNotAllowed();
}
