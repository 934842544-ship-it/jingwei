import { resolveApiUser } from "@/lib/api/auth";
import { jsonOk, methodNotAllowed, unauthorized } from "@/lib/api/http";
import { getDashboard } from "@/lib/queries";

export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const data = await getDashboard(user.id);
  return jsonOk(data);
}

export function POST() {
  return methodNotAllowed();
}
