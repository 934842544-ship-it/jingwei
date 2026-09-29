import { resolveApiUser } from "@/lib/api/auth";
import {
  badRequest,
  jsonOk,
  methodNotAllowed,
  readJsonBody,
  unauthorized,
} from "@/lib/api/http";
import {
  updateHabit as updateHabitInDb,
  deleteHabit as deleteHabitInDb,
} from "@/lib/services";
import { getHabit } from "@/lib/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const habit = await getHabit(user.id, id);
  if (!habit) return Response.json({ error: "Habit not found" }, { status: 404 });

  return jsonOk({ habit });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await readJsonBody(request);
  if (!body) return badRequest("invalid JSON body");

  const result = updateHabitInDb(user.id, id, {
    name: body.name as string | undefined,
    targetPerWeek: body.targetPerWeek as number | undefined,
    archived: body.archived as boolean | undefined,
  });

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return Response.json({ error: result.message, code: result.code }, { status });
  }

  const habit = await getHabit(user.id, id);
  return jsonOk({ habit });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const result = deleteHabitInDb(user.id, id);

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return Response.json({ error: result.message, code: result.code }, { status });
  }

  return Response.json(null, { status: 204 });
}

export function PUT() {
  return methodNotAllowed();
}
