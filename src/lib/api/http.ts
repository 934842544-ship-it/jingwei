export const PRIORITIES = ["HIGH", "NORMAL", "LOW"] as const;
export const GOAL_STATUSES = ["ACTIVE", "DONE", "ARCHIVED"] as const;
export const TASK_FILTER_STATUSES = ["all", "open", "waiting", "done"] as const;
export const TASK_STATUSES = ["OPEN", "WAITING", "DONE"] as const;

export type Priority = (typeof PRIORITIES)[number];
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export type TaskFilterStatus = (typeof TASK_FILTER_STATUSES)[number];

// ---------- 响应 ----------

export function jsonOk(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function apiError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export const badRequest = (message: string) => apiError(400, message);

export const unauthorized = () =>
  apiError(
    401,
    "Unauthorized: obtain a token via POST /api/auth/login and send it as 'Authorization: Bearer <token>'",
  );

export const notFound = (message = "Not found") => apiError(404, message);

export const methodNotAllowed = () => apiError(405, "Method not allowed");

// ---------- 请求体解析与校验 ----------

export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** 必填字符串字段 */
export function requiredText(value: unknown): { value: string } | { error: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { error: "a non-empty string is required" };
  }
  return { value: value.trim() };
}

/** 可选文本字段：缺省 → undefined；null/空串 → null（表示清空） */
export function optionalText(
  value: unknown,
): { value?: string | null } | { error: string } {
  if (value === undefined) return {};
  if (value === null) return { value: null };
  if (typeof value !== "string") return { error: "expected a string or null" };
  const s = value.trim();
  return { value: s || null };
}

/** 可选日期字段：接受 ISO 8601 字符串；null/空串表示清空 */
export function optionalDate(
  value: unknown,
): { value?: string | null } | { error: string } {
  if (value === undefined) return {};
  if (value === null || value === "") return { value: null };
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return { error: "expected an ISO 8601 date string" };
  }
  return { value: value.trim() };
}

/** 可选数字字段（自动 clamp 到 [min, max]） */
export function optionalNumber(
  value: unknown,
  min: number,
  max: number,
): { value?: number } | { error: string } {
  if (value === undefined) return {};
  const n = typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n)) return { error: "expected a number" };
  return { value: Math.max(min, Math.min(max, Math.round(n))) };
}

/** 可选布尔字段 */
export function optionalBoolean(value: unknown): { value?: boolean } | { error: string } {
  if (value === undefined) return {};
  if (typeof value === "boolean") return { value };
  return { error: "expected a boolean" };
}
