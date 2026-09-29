import { resolveApiUser } from "@/lib/api/auth";
import {
  badRequest,
  jsonOk,
  methodNotAllowed,
  readJsonBody,
  unauthorized,
} from "@/lib/api/http";
import { setManualProgress } from "@/lib/services";
import { getGoal } from "@/lib/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await readJsonBody(request);
  if (!body) return badRequest("invalid JSON body");

  const progress = Number(body.progress);
  if (!Number.isFinite(progress)) return badRequest("progress must be a number");

  const result = setManualProgress(user.id, id, progress);
  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return Response.json({ error: result.message, code: result.code }, { status });
  }

  const goal = await getGoal(user.id, id);
  return jsonOk({ goal });
}

export function GET() {
  return methodNotAllowed();
}
