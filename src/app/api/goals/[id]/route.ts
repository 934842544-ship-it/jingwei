import { resolveApiUser } from "@/lib/api/auth";
import {
  badRequest,
  jsonOk,
  methodNotAllowed,
  readJsonBody,
  unauthorized,
} from "@/lib/api/http";
import {
  updateGoal as updateGoalInDb,
  deleteGoal as deleteGoalInDb,
} from "@/lib/services";
import { getGoal, getGoalTasks } from "@/lib/queries";
import type { NextRequest } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const goal = await getGoal(user.id, id);
  if (!goal) return Response.json({ error: "Goal not found" }, { status: 404 });

  return jsonOk({ goal });
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

  const result = updateGoalInDb(user.id, id, {
    title: body.title as string | undefined,
    description: body.description as string | null | undefined,
    deadline: body.deadline as string | null | undefined,
    status: body.status as string | undefined,
    manualProgress: body.manualProgress as number | undefined,
  });

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return Response.json({ error: result.message, code: result.code }, { status });
  }

  const goal = await getGoal(user.id, id);
  return jsonOk({ goal });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const result = deleteGoalInDb(user.id, id);

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return Response.json({ error: result.message, code: result.code }, { status });
  }

  return Response.json(null, { status: 204 });
}

export function PUT() {
  return methodNotAllowed();
}
