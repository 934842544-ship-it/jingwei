import { resolveApiUser } from "@/lib/api/auth";
import {
  badRequest,
  jsonOk,
  methodNotAllowed,
  readJsonBody,
  unauthorized,
} from "@/lib/api/http";
import {
  createHabit as createHabitInDb,
} from "@/lib/services";
import { getHabits, getHabit } from "@/lib/queries";

export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const habits = await getHabits(user.id);
  return jsonOk({ habits });
}

export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const body = await readJsonBody(request);
  if (!body) return badRequest("invalid JSON body");

  const targetRaw = body.targetPerWeek;
  const targetPerWeek =
    targetRaw === undefined ? undefined :
    typeof targetRaw === "number" ? targetRaw : NaN;

  const result = createHabitInDb(user.id, {
    name: typeof body.name === "string" ? body.name : "",
    targetPerWeek,
  });

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return Response.json({ error: result.message, code: result.code }, { status });
  }

  const habit = await getHabit(user.id, result.data.id);
  return jsonOk({ habit }, 201);
}

export function PUT() {
  return methodNotAllowed();
}
