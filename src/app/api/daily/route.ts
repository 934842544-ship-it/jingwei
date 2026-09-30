import type { NextRequest } from "next/server";
import { resolveApiUser } from "@/lib/api/auth";
import {
  badRequest,
  jsonOk,
  methodNotAllowed,
  readJsonBody,
  unauthorized,
} from "@/lib/api/http";
import {
  upsertDaily,
  getDaily,
  getRecentDailies,
  type ServiceResult,
} from "@/lib/services";
import { toDateString, startOfDay, getShanghaiToday } from "@/lib/date";

export async function GET(request: NextRequest) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { searchParams } = request.nextUrl;
  const dateRaw = searchParams.get("date");
  const limitRaw = searchParams.get("limit");

  if (dateRaw) {
    if (Number.isNaN(Date.parse(dateRaw))) {
      return badRequest("date must be a valid YYYY-MM-DD or ISO 8601 date");
    }
    const date = toDateString(startOfDay(new Date(dateRaw)));
    const daily = getDaily(user.id, date);
    return jsonOk({ daily });
  }

  const limit = limitRaw ? Math.max(1, Math.min(30, parseInt(limitRaw, 10) || 7)) : 7;
  const dailies = getRecentDailies(user.id, limit);
  return jsonOk({ dailies });
}

export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const body = await readJsonBody(request);
  if (!body) return badRequest("invalid JSON body");

  const dateRaw = body.date;
  let date: string;
  if (dateRaw !== undefined && dateRaw !== null) {
    if (typeof dateRaw !== "string" || Number.isNaN(Date.parse(dateRaw))) {
      return badRequest("date must be a valid YYYY-MM-DD or ISO 8601 date");
    }
    date = toDateString(startOfDay(new Date(dateRaw)));
  } else {
    date = toDateString(startOfDay(getShanghaiToday()));
  }

  const focus = body.focus === undefined ? undefined : (body.focus as string | null);
  const win = body.win === undefined ? undefined : (body.win as string | null);
  const improve = body.improve === undefined ? undefined : (body.improve as string | null);
  const nextStep = body.nextStep === undefined ? undefined : (body.nextStep as string | null);

  const result = upsertDaily(user.id, date, { focus, win, improve, nextStep });
  return handleServiceResult(result, 200, () => {
    const daily = getDaily(user.id, date);
    return Promise.resolve({ daily });
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
