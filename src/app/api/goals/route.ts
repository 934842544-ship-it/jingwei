import type { NextRequest } from "next/server";
import { resolveApiUser } from "@/lib/api/auth";
import {
  badRequest,
  jsonOk,
  methodNotAllowed,
  parseEnum,
  GOAL_STATUSES,
  readJsonBody,
  unauthorized,
} from "@/lib/api/http";
import {
  createGoal as createGoalInDb,
} from "@/lib/services";
import { getGoals, getGoal } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const status = request.nextUrl.searchParams.get("status");
  if (status && !GOAL_STATUSES.includes(status as any)) {
    return badRequest("status must be ACTIVE, DONE, or ARCHIVED");
  }

  const goals = status
    ? (await getGoals(user.id)).filter((g) => g.status === status)
    : await getGoals(user.id);

  return jsonOk({ goals });
}

export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const body = await readJsonBody(request);
  if (!body) return badRequest("invalid JSON body");

  const result = createGoalInDb(user.id, {
    title: typeof body.title === "string" ? body.title : "",
    description: body.description === undefined ? undefined : (body.description as string | null),
    deadline: body.deadline === undefined ? undefined : (body.deadline as string | null),
  });

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return Response.json({ error: result.message, code: result.code }, { status });
  }

  const goal = await getGoal(user.id, result.data.id);
  return jsonOk({ goal }, 201);
}

export function PUT() {
  return methodNotAllowed();
}
