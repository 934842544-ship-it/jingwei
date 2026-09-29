import { resolveApiUser } from "@/lib/api/auth";
import {
  jsonOk,
  methodNotAllowed,
  unauthorized,
} from "@/lib/api/http";
import { toggleTaskDone } from "@/lib/services";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const result = toggleTaskDone(user.id, id);

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return Response.json({ error: result.message, code: result.code }, { status });
  }

  return jsonOk({ done: result.data.done });
}

export function GET() {
  return methodNotAllowed();
}
