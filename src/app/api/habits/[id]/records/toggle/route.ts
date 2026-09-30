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

  let date: Date | undefined;
  if (dateStr !== undefined && dateStr !== null) {
    if (typeof dateStr !== "string" || Number.isNaN(Date.parse(dateStr))) {
      return Response.json(
        { error: "date must be a valid date in YYYY-MM-DD or ISO 8601 format", code: "invalid_date" },
        { status: 400 },
      );
    }
    date = new Date(dateStr);
  }

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
