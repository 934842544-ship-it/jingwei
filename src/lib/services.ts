import { revalidatePath } from "next/cache";
import { getDb, cuid, nowIso } from "@/lib/db";
import { startOfDay, toDateString, getShanghaiToday } from "@/lib/date";

export type ServiceErrorCode =
  | "not_found"
  | "invalid_title"
  | "invalid_name"
  | "invalid_goal"
  | "invalid_status"
  | "invalid_date"
  | "no_fields";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ServiceErrorCode; message: string };

const FAIL_MESSAGES: Record<ServiceErrorCode, string> = {
  not_found: "Resource not found",
  invalid_title: "A non-empty title is required",
  invalid_name: "A non-empty name is required",
  invalid_goal: "goalId does not reference one of your goals",
  invalid_status: "status must be one of ACTIVE | DONE | ARCHIVED",
  invalid_date: "date must be a valid date in YYYY-MM-DD or ISO 8601 format",
  no_fields: "No updatable fields were provided",
};

function fail<T>(code: ServiceErrorCode): ServiceResult<T> {
  return { ok: false, code, message: FAIL_MESSAGES[code] };
}

function revalidate() {
  revalidatePath("/", "layout");
}

// ---------- Tasks ----------

export interface CreateTaskInput {
  title: string;
  notes?: string | null;
  goalId?: string | null;
  priority?: string | null;
  dueDate?: string | null;
}

export function createTask(userId: string, input: CreateTaskInput): ServiceResult<{ id: string }> {
  const title = input.title?.trim();
  if (!title) return fail("invalid_title");

  const notes = input.notes?.trim() || null;
  const goalId = input.goalId?.trim() || null;
  const priority = input.priority?.trim() || "NORMAL";
  const dueDate = input.dueDate?.trim() || null;

  const db = getDb();
  if (goalId) {
    const goal = db
      .prepare("SELECT id FROM Goal WHERE id = @goalId AND userId = @userId")
      .get({ goalId, userId });
    if (!goal) return fail("invalid_goal");
  }

  const id = cuid();
  const now = nowIso();
  db.prepare(
    `INSERT INTO Task (id, userId, title, notes, goalId, priority, dueDate, done, createdAt, updatedAt)
     VALUES (@id, @userId, @title, @notes, @goalId, @priority, @dueDate, 0, @createdAt, @updatedAt)`,
  ).run({ id, userId, title, notes, goalId, priority, dueDate, createdAt: now, updatedAt: now });

  revalidate();
  return { ok: true, data: { id } };
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  goalId?: string | null;
  priority?: string;
  dueDate?: string | null;
}

export function updateTask(userId: string, id: string, data: UpdateTaskInput): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM Task WHERE id = @id AND userId = @userId")
    .get({ id, userId });
  if (!existing) return fail("not_found");

  if (data.title !== undefined && !data.title.trim()) return fail("invalid_title");

  if (data.goalId !== undefined && data.goalId !== null && data.goalId.trim() !== "") {
    const goal = db
      .prepare("SELECT id FROM Goal WHERE id = @goalId AND userId = @userId")
      .get({ goalId: data.goalId.trim(), userId });
    if (!goal) return fail("invalid_goal");
  }

  const fields: string[] = [];
  const params: Record<string, string | number | null> = { id, userId };

  if (data.title !== undefined) {
    fields.push("title = @title");
    params.title = data.title.trim();
  }
  if (data.notes !== undefined) {
    fields.push("notes = @notes");
    params.notes = data.notes?.trim() || null;
  }
  if (data.goalId !== undefined) {
    fields.push("goalId = @goalId");
    params.goalId = data.goalId?.trim() || null;
  }
  if (data.priority !== undefined) {
    fields.push("priority = @priority");
    params.priority = data.priority;
  }
  if (data.dueDate !== undefined) {
    fields.push("dueDate = @dueDate");
    params.dueDate = data.dueDate?.trim() || null;
  }
  if (fields.length === 0) return fail("no_fields");

  fields.push("updatedAt = datetime('now')");
  db.prepare(`UPDATE Task SET ${fields.join(", ")} WHERE id = @id AND userId = @userId`).run(params);
  revalidate();
  return { ok: true, data: undefined };
}

export function toggleTaskDone(userId: string, id: string): ServiceResult<{ done: boolean }> {
  const db = getDb();
  const task = db
    .prepare("SELECT done FROM Task WHERE id = @id AND userId = @userId")
    .get({ id, userId }) as { done: number } | undefined;
  if (!task) return fail("not_found");

  const newDone = task.done ? 0 : 1;
  const doneAt = newDone ? nowIso() : null;

  db.prepare(
    `UPDATE Task SET done = @done, doneAt = @doneAt, updatedAt = datetime('now')
     WHERE id = @id AND userId = @userId`,
  ).run({ id, userId, done: newDone, doneAt });

  revalidate();
  return { ok: true, data: { done: !!newDone } };
}

export function deleteTask(userId: string, id: string): ServiceResult<undefined> {
  const db = getDb();
  const info = db
    .prepare("DELETE FROM Task WHERE id = @id AND userId = @userId")
    .run({ id, userId });
  if (info.changes === 0) return fail("not_found");
  revalidate();
  return { ok: true, data: undefined };
}

// ---------- Goals ----------

export interface CreateGoalInput {
  title: string;
  description?: string | null;
  deadline?: string | null;
}

export function createGoal(userId: string, input: CreateGoalInput): ServiceResult<{ id: string }> {
  const title = input.title?.trim();
  if (!title) return fail("invalid_title");

  const db = getDb();
  const id = cuid();
  const now = nowIso();
  db.prepare(
    `INSERT INTO Goal (id, userId, title, description, deadline, status, manualProgress, createdAt, updatedAt)
     VALUES (@id, @userId, @title, @description, @deadline, 'ACTIVE', 0, @createdAt, @updatedAt)`,
  ).run({
    id,
    userId,
    title,
    description: input.description?.trim() || null,
    deadline: input.deadline?.trim() || null,
    createdAt: now,
    updatedAt: now,
  });

  revalidate();
  return { ok: true, data: { id } };
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  deadline?: string | null;
  status?: string;
  manualProgress?: number;
}

export function updateGoal(userId: string, id: string, data: UpdateGoalInput): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM Goal WHERE id = @id AND userId = @userId")
    .get({ id, userId });
  if (!existing) return fail("not_found");

  if (data.title !== undefined && !data.title.trim()) return fail("invalid_title");
  if (
    data.status !== undefined &&
    !["ACTIVE", "DONE", "ARCHIVED"].includes(data.status)
  ) {
    return fail("invalid_status");
  }

  const fields: string[] = [];
  const params: Record<string, string | number | null> = { id, userId };

  if (data.title !== undefined) {
    fields.push("title = @title");
    params.title = data.title.trim();
  }
  if (data.description !== undefined) {
    fields.push("description = @description");
    params.description = data.description?.trim() || null;
  }
  if (data.deadline !== undefined) {
    fields.push("deadline = @deadline");
    params.deadline = data.deadline?.trim() || null;
  }
  if (data.status !== undefined) {
    fields.push("status = @status");
    params.status = data.status;
  }
  if (data.manualProgress !== undefined) {
    fields.push("manualProgress = @manualProgress");
    params.manualProgress = Math.max(0, Math.min(100, Math.round(data.manualProgress)));
  }
  if (fields.length === 0) return fail("no_fields");

  fields.push("updatedAt = datetime('now')");
  db.prepare(`UPDATE Goal SET ${fields.join(", ")} WHERE id = @id AND userId = @userId`).run(params);
  revalidate();
  return { ok: true, data: undefined };
}

export function setManualProgress(userId: string, id: string, progress: number): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM Goal WHERE id = @id AND userId = @userId")
    .get({ id, userId });
  if (!existing) return fail("not_found");

  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  db.prepare(
    `UPDATE Goal SET manualProgress = @progress, updatedAt = datetime('now')
     WHERE id = @id AND userId = @userId`,
  ).run({ id, userId, progress: clamped });

  revalidate();
  return { ok: true, data: undefined };
}

export function deleteGoal(userId: string, id: string): ServiceResult<undefined> {
  const db = getDb();
  const info = db
    .prepare("DELETE FROM Goal WHERE id = @id AND userId = @userId")
    .run({ id, userId });
  if (info.changes === 0) return fail("not_found");
  revalidate();
  return { ok: true, data: undefined };
}

// ---------- Habits ----------

export interface CreateHabitInput {
  name: string;
  targetPerWeek?: number;
}

export function createHabit(userId: string, input: CreateHabitInput): ServiceResult<{ id: string }> {
  const name = input.name?.trim();
  if (!name) return fail("invalid_name");

  const rawTarget = input.targetPerWeek;
  const targetPerWeek =
    rawTarget === undefined || !Number.isFinite(rawTarget)
      ? 7
      : Math.max(1, Math.min(7, Math.round(rawTarget)));

  const db = getDb();
  const id = cuid();
  db.prepare(
    `INSERT INTO Habit (id, userId, name, targetPerWeek, createdAt)
     VALUES (@id, @userId, @name, @targetPerWeek, @createdAt)`,
  ).run({ id, userId, name, targetPerWeek, createdAt: nowIso() });

  revalidate();
  return { ok: true, data: { id } };
}

export interface UpdateHabitInput {
  name?: string;
  targetPerWeek?: number;
  archived?: boolean;
}

export function updateHabit(userId: string, id: string, data: UpdateHabitInput): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM Habit WHERE id = @id AND userId = @userId")
    .get({ id, userId });
  if (!existing) return fail("not_found");

  if (data.name !== undefined && !data.name.trim()) return fail("invalid_name");

  const fields: string[] = [];
  const params: Record<string, string | number | null> = { id, userId };

  if (data.name !== undefined) {
    fields.push("name = @name");
    params.name = data.name.trim();
  }
  if (data.targetPerWeek !== undefined) {
    fields.push("targetPerWeek = @targetPerWeek");
    params.targetPerWeek = Math.max(1, Math.min(7, Math.round(data.targetPerWeek)));
  }
  if (data.archived !== undefined) {
    fields.push("archived = @archived");
    params.archived = data.archived ? 1 : 0;
  }
  if (fields.length === 0) return fail("no_fields");

  db.prepare(`UPDATE Habit SET ${fields.join(", ")} WHERE id = @id AND userId = @userId`).run(params);
  revalidate();
  return { ok: true, data: undefined };
}

export function toggleHabitRecord(
  userId: string,
  habitId: string,
  date?: Date,
): ServiceResult<{ recorded: boolean }> {
  const db = getDb();

  const habit = db
    .prepare("SELECT id FROM Habit WHERE id = @habitId AND userId = @userId")
    .get({ habitId, userId });
  if (!habit) return fail("not_found");

  const targetDate = date ?? getShanghaiToday();
  if (Number.isNaN(targetDate.getTime())) return fail("invalid_date");
  const dateStr = toDateString(startOfDay(targetDate));

  const existing = db
    .prepare("SELECT id FROM HabitRecord WHERE habitId = @habitId AND date = @date")
    .get({ habitId, date: dateStr });

  if (existing) {
    db.prepare("DELETE FROM HabitRecord WHERE habitId = @habitId AND date = @date")
      .run({ habitId, date: dateStr });
    revalidate();
    return { ok: true, data: { recorded: false } };
  }

  db.prepare(
    `INSERT OR IGNORE INTO HabitRecord (id, habitId, date, createdAt)
     VALUES (@id, @habitId, @date, @createdAt)`,
  ).run({ id: cuid(), habitId, date: dateStr, createdAt: nowIso() });

  revalidate();
  return { ok: true, data: { recorded: true } };
}

export function deleteHabit(userId: string, id: string): ServiceResult<undefined> {
  const db = getDb();
  const info = db
    .prepare("DELETE FROM Habit WHERE id = @id AND userId = @userId")
    .run({ id, userId });
  if (info.changes === 0) return fail("not_found");
  revalidate();
  return { ok: true, data: undefined };
}
