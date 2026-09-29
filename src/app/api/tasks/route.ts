import type { NextRequest } from "next/server";
import { resolveApiUser } from "@/lib/api/auth";
import {
  badRequest,
  jsonOk,
  methodNotAllowed,
  parseEnum,
  PRIORITIES,
  readJsonBody,
  TASK_FILTER_STATUSES,
  unauthorized,
} from "@/lib/api/http";
import {
  createTask as createTaskInDb,
  type ServiceResult,
} from "@/lib/services";
import { getTasks, getTask } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { searchParams } = request.nextUrl;
  const statusRaw = searchParams.get("status") ?? "all";
  const priorityRaw = searchParams.get("priority") ?? "all";
  const goalId = searchParams.get("goalId") ?? "all";
  const today = searchParams.get("today") === "1";

  const status = parseEnum(statusRaw, TASK_FILTER_STATUSES) ?? "all";
  const priority = parseEnum(priorityRaw, ["all", ...PRIORITIES]) ?? "all";

  const tasks = await getTasks(user.id, {
    status,
    priority,
    goalId,
    today,
  });

  return jsonOk({ tasks });
}

export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const body = await readJsonBody(request);
  if (!body) return badRequest("invalid JSON body");

  const result = createTaskInDb(user.id, {
    title: typeof body.title === "string" ? body.title : "",
    notes: body.notes === undefined ? undefined : (body.notes as string | null),
    goalId: body.goalId === undefined ? undefined : (body.goalId as string | null),
    priority: body.priority === undefined ? undefined : (body.priority as string | null),
    dueDate: body.dueDate === undefined ? undefined : (body.dueDate as string | null),
  });

  return handleServiceResult(result, 201, (data) => {
    // 重新查询完整对象返回
    return getTask(user.id, data.id).then((t) => ({ task: t }));
  });
}

export function PUT() {
  return methodNotAllowed();
}

async function handleServiceResult<T, R = T>(
  result: ServiceResult<T>,
  okStatus = 200,
  buildOk?: (data: T) => Promise<R>,
): Promise<Response> {
  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return Response.json({ error: result.message, code: result.code }, { status });
  }
  const body = buildOk ? await buildOk(result.data) : result.data;
  return Response.json(body, { status: okStatus });
}
