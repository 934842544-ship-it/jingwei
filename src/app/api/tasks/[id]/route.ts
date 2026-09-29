import { resolveApiUser } from "@/lib/api/auth";
import {
  badRequest,
  jsonOk,
  methodNotAllowed,
  readJsonBody,
  unauthorized,
} from "@/lib/api/http";
import {
  updateTask as updateTaskInDb,
  deleteTask as deleteTaskInDb,
  type ServiceResult,
} from "@/lib/services";
import { getTask } from "@/lib/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const task = await getTask(user.id, id);
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  return jsonOk({ task });
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

  const result = updateTaskInDb(user.id, id, {
    title: body.title as string | undefined,
    notes: body.notes as string | null | undefined,
    goalId: body.goalId as string | null | undefined,
    priority: body.priority as string | undefined,
    dueDate: body.dueDate as string | null | undefined,
  });

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return Response.json({ error: result.message, code: result.code }, { status });
  }

  const task = await getTask(user.id, id);
  return jsonOk({ task });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const result = deleteTaskInDb(user.id, id);

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return Response.json({ error: result.message, code: result.code }, { status });
  }

  return Response.json(null, { status: 204 });
}

export function PUT() {
  return methodNotAllowed();
}
