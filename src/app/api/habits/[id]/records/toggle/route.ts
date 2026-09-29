import { resolveApiUser } from "@/lib/api/auth";
import {
  badRequest,
  jsonOk,
  methodNotAllowed,
  readJsonBody,
  unauthorized,
} from "@/lib/api/http";
import { toggleHabitRecord } from "@/lib/services";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await readJsonBody(request);
  const dateStr = body?.date;
  const date =
    dateStr && typeof dateStr === "string" && !Number.isNaN(Date.parse(dateStr))
      ? new Date(dateStr)
      : undefined;

  const result = toggleHabitRecord(user.id, id, date);
  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return Response.json({ error: result.message, code: result.code }, { status });
  }

  return jsonOk({ recorded: result.data.recorded });
}

export function GET() {
  return methodNotAllowed();
}
