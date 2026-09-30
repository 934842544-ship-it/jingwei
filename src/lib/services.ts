import { revalidatePath } from "next/cache";
import type Database from "better-sqlite3";
import { getDb, cuid, nowIso } from "@/lib/db";
import { startOfDay, toDateString, getShanghaiToday } from "@/lib/date";

export type ServiceErrorCode =
  | "not_found"
  | "invalid_title"
  | "invalid_name"
  | "invalid_goal"
  | "invalid_status"
  | "invalid_date"
  | "no_fields"
  | "invalid_focus"
  | "invalid_parent"
  | "invalid_progress_mode"
  | "auto_progress_locked";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ServiceErrorCode; message: string };

const FAIL_MESSAGES: Record<ServiceErrorCode, string> = {
  not_found: "Resource not found",
  invalid_title: "A non-empty title is required",
  invalid_name: "A non-empty name is required",
  invalid_goal: "goalId does not reference one of your goals",
  invalid_status: "status must be one of OPEN | WAITING | DONE",
  invalid_date: "date must be a valid date in YYYY-MM-DD or ISO 8601 format",
  no_fields: "No updatable fields were provided",
  invalid_focus: "focus must not be empty when setting daily focus",
  invalid_parent: "parentId does not reference one of your goals or would create a cycle",
  invalid_progress_mode: "progressMode must be one of AUTO | MANUAL",
  auto_progress_locked: "Cannot set manual progress when progressMode is AUTO",
};

function fail<T>(code: ServiceErrorCode): ServiceResult<T> {
  return { ok: false, code, message: FAIL_MESSAGES[code] };
}

function revalidate() {
  revalidatePath("/", "layout");
}

// ---------- Event Log ----------

export interface EventLogEntry {
  id: string;
  entityType: "task" | "goal" | "habit";
  entityId: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

function logEvent(
  userId: string,
  entityType: "task" | "goal" | "habit",
  entityId: string,
  action: string,
  before: Record<string, unknown> | null = null,
  after: Record<string, unknown> | null = null,
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO EventLog (id, userId, entityType, entityId, action, before, after, createdAt)
     VALUES (@id, @userId, @entityType, @entityId, @action, @before, @after, @createdAt)`,
  ).run({
    id: cuid(),
    userId,
    entityType,
    entityId,
    action,
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null,
    createdAt: nowIso(),
  });
}

function rowToEvent(row: {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  before: string | null;
  after: string | null;
  createdAt: string;
}): EventLogEntry {
  return {
    id: row.id,
    entityType: row.entityType as "task" | "goal" | "habit",
    entityId: row.entityId,
    action: row.action,
    before: row.before ? JSON.parse(row.before) : null,
    after: row.after ? JSON.parse(row.after) : null,
    createdAt: row.createdAt,
  };
}

export function getEventsForEntity(
  userId: string,
  entityType: "task" | "goal" | "habit",
  entityId: string,
  limit = 20,
): EventLogEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM EventLog
       WHERE userId = @userId AND entityType = @entityType AND entityId = @entityId
       ORDER BY createdAt DESC
       LIMIT @limit`,
    )
    .all({ userId, entityType, entityId, limit }) as {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    before: string | null;
    after: string | null;
    createdAt: string;
  }[];
  return rows.map(rowToEvent);
}

export function getRecentEvents(userId: string, limit = 30): EventLogEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM EventLog
       WHERE userId = @userId
       ORDER BY createdAt DESC
       LIMIT @limit`,
    )
    .all({ userId, limit }) as {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    before: string | null;
    after: string | null;
    createdAt: string;
  }[];
  return rows.map(rowToEvent);
}

// ---------- Tasks ----------

const TASK_STATUSES = ["OPEN", "WAITING", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ChecklistItemInput {
  text: string;
}

export interface CreateTaskInput {
  title: string;
  notes?: string | null;
  goalId?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  plannedDate?: string | null;
  checklist?: ChecklistItem[] | null;
  estimatedMinutes?: number | null;
}

function taskSnapshot(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return { ...row };
}

function parseChecklist(raw: string | null): ChecklistItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ChecklistItem[];
    return null;
  } catch {
    return null;
  }
}

function serializeChecklist(items: ChecklistItem[] | null | undefined): string | null {
  if (items === undefined || items === null) return null;
  return JSON.stringify(items);
}

export function createTask(userId: string, input: CreateTaskInput): ServiceResult<{ id: string }> {
  const title = input.title?.trim();
  if (!title) return fail("invalid_title");

  const notes = input.notes?.trim() || null;
  const goalId = input.goalId?.trim() || null;
  const priority = input.priority?.trim() || "NORMAL";
  const dueDate = input.dueDate?.trim() || null;
  const plannedDate = input.plannedDate?.trim() || null;
  const checklist = serializeChecklist(input.checklist);
  const estimatedMinutes = input.estimatedMinutes ?? null;

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
    `INSERT INTO Task (id, userId, title, notes, goalId, priority, dueDate, plannedDate, status, checklist, estimatedMinutes, done, createdAt, updatedAt)
     VALUES (@id, @userId, @title, @notes, @goalId, @priority, @dueDate, @plannedDate, 'OPEN', @checklist, @estimatedMinutes, 0, @createdAt, @updatedAt)`,
  ).run({
    id,
    userId,
    title,
    notes,
    goalId,
    priority,
    dueDate,
    plannedDate,
    checklist,
    estimatedMinutes,
    createdAt: now,
    updatedAt: now,
  });

  logEvent(userId, "task", id, "create", null, {
    title,
    priority,
    goalId,
    dueDate,
    plannedDate,
    status: "OPEN",
    estimatedMinutes: estimatedMinutes ?? null,
  });

  revalidate();
  return { ok: true, data: { id } };
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  goalId?: string | null;
  priority?: string;
  dueDate?: string | null;
  plannedDate?: string | null;
  status?: string;
  waitingOn?: string | null;
  followUpDate?: string | null;
  checklist?: ChecklistItem[] | null;
  estimatedMinutes?: number | null;
}

export function updateTask(userId: string, id: string, data: UpdateTaskInput): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM Task WHERE id = @id AND userId = @userId")
    .get({ id, userId }) as Record<string, unknown> | undefined;
  if (!existing) return fail("not_found");

  if (data.title !== undefined && !data.title.trim()) return fail("invalid_title");
  if (data.status !== undefined && !TASK_STATUSES.includes(data.status as TaskStatus)) {
    return fail("invalid_status");
  }

  if (data.goalId !== undefined && data.goalId !== null && data.goalId.trim() !== "") {
    const goal = db
      .prepare("SELECT id FROM Goal WHERE id = @goalId AND userId = @userId")
      .get({ goalId: data.goalId.trim(), userId });
    if (!goal) return fail("invalid_goal");
  }

  const fields: string[] = [];
  const params: Record<string, string | number | null> = { id, userId };
  const changes: Record<string, unknown> = {};

  if (data.title !== undefined) {
    fields.push("title = @title");
    params.title = data.title.trim();
    changes.title = data.title.trim();
  }
  if (data.notes !== undefined) {
    fields.push("notes = @notes");
    params.notes = data.notes?.trim() || null;
    changes.notes = data.notes?.trim() || null;
  }
  if (data.goalId !== undefined) {
    fields.push("goalId = @goalId");
    params.goalId = data.goalId?.trim() || null;
    changes.goalId = data.goalId?.trim() || null;
  }
  if (data.priority !== undefined) {
    fields.push("priority = @priority");
    params.priority = data.priority;
    changes.priority = data.priority;
  }
  if (data.dueDate !== undefined) {
    fields.push("dueDate = @dueDate");
    params.dueDate = data.dueDate?.trim() || null;
    changes.dueDate = data.dueDate?.trim() || null;
  }
  if (data.plannedDate !== undefined) {
    fields.push("plannedDate = @plannedDate");
    params.plannedDate = data.plannedDate?.trim() || null;
    changes.plannedDate = data.plannedDate?.trim() || null;
  }
  if (data.status !== undefined) {
    fields.push("status = @status");
    params.status = data.status;
    changes.status = data.status;
    if (data.status === "DONE") {
      fields.push("done = 1");
      fields.push("doneAt = datetime('now')");
      changes.done = 1;
    } else {
      fields.push("done = 0");
      fields.push("doneAt = NULL");
      changes.done = 0;
    }
  }
  if (data.waitingOn !== undefined) {
    fields.push("waitingOn = @waitingOn");
    params.waitingOn = data.waitingOn?.trim() || null;
    changes.waitingOn = data.waitingOn?.trim() || null;
  }
  if (data.followUpDate !== undefined) {
    fields.push("followUpDate = @followUpDate");
    params.followUpDate = data.followUpDate?.trim() || null;
    changes.followUpDate = data.followUpDate?.trim() || null;
  }
  if (data.checklist !== undefined) {
    fields.push("checklist = @checklist");
    params.checklist = serializeChecklist(data.checklist);
    changes.checklist = data.checklist ?? null;
  }
  if (data.estimatedMinutes !== undefined) {
    fields.push("estimatedMinutes = @estimatedMinutes");
    params.estimatedMinutes = data.estimatedMinutes;
    changes.estimatedMinutes = data.estimatedMinutes;
  }
  if (fields.length === 0) return fail("no_fields");

  fields.push("updatedAt = datetime('now')");
  db.prepare(`UPDATE Task SET ${fields.join(", ")} WHERE id = @id AND userId = @userId`).run(params);

  logEvent(userId, "task", id, "update", taskSnapshot(existing), changes);

  revalidate();
  return { ok: true, data: undefined };
}

export function toggleTaskDone(userId: string, id: string): ServiceResult<{ done: boolean; status: TaskStatus }> {
  const db = getDb();
  const task = db
    .prepare("SELECT * FROM Task WHERE id = @id AND userId = @userId")
    .get({ id, userId }) as Record<string, unknown> | undefined;
  if (!task) return fail("not_found");

  const wasDone = task["done"] === 1;
  const newDone = wasDone ? 0 : 1;
  const newStatus: TaskStatus = newDone ? "DONE" : "OPEN";
  const doneAt = newDone ? nowIso() : null;

  db.prepare(
    `UPDATE Task SET done = @done, status = @status, doneAt = @doneAt, updatedAt = datetime('now')
     WHERE id = @id AND userId = @userId`,
  ).run({ id, userId, done: newDone, status: newStatus, doneAt });

  logEvent(
    userId,
    "task",
    id,
    newDone ? "mark_done" : "mark_open",
    { done: wasDone, status: task["status"] },
    { done: newDone, status: newStatus },
  );

  revalidate();
  return { ok: true, data: { done: !!newDone, status: newStatus } };
}

export function setTaskWaiting(
  userId: string,
  id: string,
  waitingOn: string,
  followUpDate?: string | null,
): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM Task WHERE id = @id AND userId = @userId")
    .get({ id, userId }) as Record<string, unknown> | undefined;
  if (!existing) return fail("not_found");

  const waitingOnTrimmed = waitingOn.trim();
  if (!waitingOnTrimmed) {
    return fail("invalid_title");
  }

  const followUp = followUpDate?.trim() || null;

  db.prepare(
    `UPDATE Task SET status = 'WAITING', waitingOn = @waitingOn, followUpDate = @followUpDate,
     done = 0, doneAt = NULL, updatedAt = datetime('now')
     WHERE id = @id AND userId = @userId`,
  ).run({ id, userId, waitingOn: waitingOnTrimmed, followUpDate: followUp });

  logEvent(
    userId,
    "task",
    id,
    "set_waiting",
    { status: existing["status"], waitingOn: existing["waitingOn"], followUpDate: existing["followUpDate"] },
    { status: "WAITING", waitingOn: waitingOnTrimmed, followUpDate: followUp },
  );

  revalidate();
  return { ok: true, data: undefined };
}

export function deleteTask(userId: string, id: string): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM Task WHERE id = @id AND userId = @userId")
    .get({ id, userId }) as Record<string, unknown> | undefined;
  if (!existing) return fail("not_found");

  db.prepare("DELETE FROM Task WHERE id = @id AND userId = @userId").run({ id, userId });

  logEvent(userId, "task", id, "delete", taskSnapshot(existing), null);

  revalidate();
  return { ok: true, data: undefined };
}

export function addChecklistItem(
  userId: string,
  taskId: string,
  text: string,
): ServiceResult<{ itemId: string }> {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM Task WHERE id = @id AND userId = @userId")
    .get({ id: taskId, userId }) as Record<string, unknown> | undefined;
  if (!existing) return fail("not_found");

  const trimmed = text.trim();
  if (!trimmed) return fail("invalid_title");

  const items = parseChecklist(existing["checklist"] as string | null) ?? [];
  const newItem: ChecklistItem = {
    id: cuid(),
    text: trimmed,
    done: false,
  };
  items.push(newItem);
  const serialized = serializeChecklist(items);

  db.prepare(
    `UPDATE Task SET checklist = @checklist, updatedAt = datetime('now')
     WHERE id = @id AND userId = @userId`,
  ).run({ id: taskId, userId, checklist: serialized });

  logEvent(
    userId,
    "task",
    taskId,
    "add_checklist_item",
    { checklist: items.slice(0, -1) },
    { checklist: items },
  );

  revalidate();
  return { ok: true, data: { itemId: newItem.id } };
}

export function toggleChecklistItem(
  userId: string,
  taskId: string,
  itemId: string,
): ServiceResult<{ done: boolean }> {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM Task WHERE id = @id AND userId = @userId")
    .get({ id: taskId, userId }) as Record<string, unknown> | undefined;
  if (!existing) return fail("not_found");

  const items = parseChecklist(existing["checklist"] as string | null) ?? [];
  const item = items.find((i) => i.id === itemId);
  if (!item) return fail("not_found");

  const newDone = !item.done;
  item.done = newDone;
  const serialized = serializeChecklist(items);

  db.prepare(
    `UPDATE Task SET checklist = @checklist, updatedAt = datetime('now')
     WHERE id = @id AND userId = @userId`,
  ).run({ id: taskId, userId, checklist: serialized });

  logEvent(
    userId,
    "task",
    taskId,
    "toggle_checklist_item",
    { itemId, done: !newDone },
    { itemId, done: newDone },
  );

  revalidate();
  return { ok: true, data: { done: newDone } };
}

export function removeChecklistItem(
  userId: string,
  taskId: string,
  itemId: string,
): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM Task WHERE id = @id AND userId = @userId")
    .get({ id: taskId, userId }) as Record<string, unknown> | undefined;
  if (!existing) return fail("not_found");

  const items = parseChecklist(existing["checklist"] as string | null) ?? [];
  const filtered = items.filter((i) => i.id !== itemId);
  if (filtered.length === items.length) return fail("not_found");

  const serialized = serializeChecklist(filtered);

  db.prepare(
    `UPDATE Task SET checklist = @checklist, updatedAt = datetime('now')
     WHERE id = @id AND userId = @userId`,
  ).run({ id: taskId, userId, checklist: serialized });

  logEvent(
    userId,
    "task",
    taskId,
    "remove_checklist_item",
    { checklist: items },
    { checklist: filtered },
  );

  revalidate();
  return { ok: true, data: undefined };
}

// ---------- Goals ----------

const PROGRESS_MODES = ["AUTO", "MANUAL"] as const;
export type ProgressMode = (typeof PROGRESS_MODES)[number];

export interface CreateGoalInput {
  title: string;
  description?: string | null;
  deadline?: string | null;
  parentId?: string | null;
  progressMode?: ProgressMode;
}

function goalSnapshot(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return { ...row };
}

function wouldCreateCycle(db: Database.Database, userId: string, parentId: string, goalId: string): boolean {
  let current = parentId;
  const visited = new Set<string>();
  while (current && current !== goalId) {
    if (visited.has(current)) return true;
    visited.add(current);
    const row = db
      .prepare("SELECT parentId FROM Goal WHERE id = @id AND userId = @userId")
      .get({ id: current, userId }) as { parentId: string | null } | undefined;
    if (!row) return false;
    current = row.parentId || "";
  }
  return current === goalId;
}

export function createGoal(userId: string, input: CreateGoalInput): ServiceResult<{ id: string }> {
  const title = input.title?.trim();
  if (!title) return fail("invalid_title");

  const db = getDb();
  const parentId = input.parentId?.trim() || null;
  const progressMode = input.progressMode && PROGRESS_MODES.includes(input.progressMode)
    ? input.progressMode
    : "MANUAL";

  if (parentId) {
    const parent = db
      .prepare("SELECT id FROM Goal WHERE id = @parentId AND userId = @userId")
      .get({ parentId, userId });
    if (!parent) return fail("invalid_parent");
  }

  const id = cuid();
  const now = nowIso();
  db.prepare(
    `INSERT INTO Goal (id, userId, parentId, title, description, deadline, status, progressMode, manualProgress, createdAt, updatedAt)
     VALUES (@id, @userId, @parentId, @title, @description, @deadline, 'ACTIVE', @progressMode, 0, @createdAt, @updatedAt)`,
  ).run({
    id,
    userId,
    parentId,
    title,
    description: input.description?.trim() || null,
    deadline: input.deadline?.trim() || null,
    progressMode,
    createdAt: now,
    updatedAt: now,
  });

  logEvent(userId, "goal", id, "create", null, {
    title,
    parentId,
    description: input.description?.trim() || null,
    deadline: input.deadline?.trim() || null,
    status: "ACTIVE",
    progressMode,
    manualProgress: 0,
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
  parentId?: string | null;
  progressMode?: ProgressMode;
}

export function updateGoal(userId: string, id: string, data: UpdateGoalInput): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM Goal WHERE id = @id AND userId = @userId")
    .get({ id, userId }) as Record<string, unknown> | undefined;
  if (!existing) return fail("not_found");

  if (data.title !== undefined && !data.title.trim()) return fail("invalid_title");
  if (
    data.status !== undefined &&
    !["ACTIVE", "DONE", "ARCHIVED"].includes(data.status)
  ) {
    return fail("invalid_status");
  }
  if (data.progressMode !== undefined && !PROGRESS_MODES.includes(data.progressMode)) {
    return fail("invalid_progress_mode");
  }
  if (
    data.manualProgress !== undefined &&
    (existing["progressMode"] === "AUTO" && data.progressMode !== "MANUAL")
  ) {
    return fail("auto_progress_locked");
  }

  if (data.parentId !== undefined) {
    const newParentId = data.parentId?.trim() || null;
    if (newParentId) {
      if (newParentId === id) return fail("invalid_parent");
      const parent = db
        .prepare("SELECT id FROM Goal WHERE id = @parentId AND userId = @userId")
        .get({ parentId: newParentId, userId });
      if (!parent) return fail("invalid_parent");
      if (wouldCreateCycle(db, userId, newParentId, id)) return fail("invalid_parent");
    }
  }

  const fields: string[] = [];
  const params: Record<string, string | number | null> = { id, userId };
  const changes: Record<string, unknown> = {};

  if (data.title !== undefined) {
    fields.push("title = @title");
    params.title = data.title.trim();
    changes.title = data.title.trim();
  }
  if (data.description !== undefined) {
    fields.push("description = @description");
    params.description = data.description?.trim() || null;
    changes.description = data.description?.trim() || null;
  }
  if (data.deadline !== undefined) {
    fields.push("deadline = @deadline");
    params.deadline = data.deadline?.trim() || null;
    changes.deadline = data.deadline?.trim() || null;
  }
  if (data.status !== undefined) {
    fields.push("status = @status");
    params.status = data.status;
    changes.status = data.status;
  }
  if (data.parentId !== undefined) {
    fields.push("parentId = @parentId");
    params.parentId = data.parentId?.trim() || null;
    changes.parentId = data.parentId?.trim() || null;
  }
  if (data.progressMode !== undefined) {
    fields.push("progressMode = @progressMode");
    params.progressMode = data.progressMode;
    changes.progressMode = data.progressMode;
  }
  if (data.manualProgress !== undefined) {
    const clamped = Math.max(0, Math.min(100, Math.round(data.manualProgress)));
    fields.push("manualProgress = @manualProgress");
    params.manualProgress = clamped;
    changes.manualProgress = clamped;
  }
  if (fields.length === 0) return fail("no_fields");

  fields.push("updatedAt = datetime('now')");
  db.prepare(`UPDATE Goal SET ${fields.join(", ")} WHERE id = @id AND userId = @userId`).run(params);

  logEvent(userId, "goal", id, "update", goalSnapshot(existing), changes);

  revalidate();
  return { ok: true, data: undefined };
}

export function setManualProgress(userId: string, id: string, progress: number): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM Goal WHERE id = @id AND userId = @userId")
    .get({ id, userId }) as Record<string, unknown> | undefined;
  if (!existing) return fail("not_found");

  if (existing["progressMode"] === "AUTO") {
    return fail("auto_progress_locked");
  }

  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  db.prepare(
    `UPDATE Goal SET manualProgress = @progress, updatedAt = datetime('now')
     WHERE id = @id AND userId = @userId`,
  ).run({ id, userId, progress: clamped });

  logEvent(
    userId,
    "goal",
    id,
    "set_progress",
    { manualProgress: existing["manualProgress"] },
    { manualProgress: clamped },
  );

  revalidate();
  return { ok: true, data: undefined };
}

export function setProgressMode(
  userId: string,
  id: string,
  mode: ProgressMode,
): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM Goal WHERE id = @id AND userId = @userId")
    .get({ id, userId }) as Record<string, unknown> | undefined;
  if (!existing) return fail("not_found");

  if (!PROGRESS_MODES.includes(mode)) {
    return fail("invalid_progress_mode");
  }

  db.prepare(
    `UPDATE Goal SET progressMode = @mode, updatedAt = datetime('now')
     WHERE id = @id AND userId = @userId`,
  ).run({ id, userId, mode });

  logEvent(
    userId,
    "goal",
    id,
    "set_progress_mode",
    { progressMode: existing["progressMode"] },
    { progressMode: mode },
  );

  revalidate();
  return { ok: true, data: undefined };
}

export function deleteGoal(userId: string, id: string): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM Goal WHERE id = @id AND userId = @userId")
    .get({ id, userId }) as Record<string, unknown> | undefined;
  if (!existing) return fail("not_found");

  db.prepare("DELETE FROM Goal WHERE id = @id AND userId = @userId").run({ id, userId });

  logEvent(userId, "goal", id, "delete", goalSnapshot(existing), null);

  revalidate();
  return { ok: true, data: undefined };
}

// ---------- Habits ----------

export interface CreateHabitInput {
  name: string;
  targetPerWeek?: number;
}

function habitSnapshot(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return { ...row };
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
    `INSERT INTO Habit (id, userId, name, targetPerWeek, archived, createdAt)
     VALUES (@id, @userId, @name, @targetPerWeek, 0, @createdAt)`,
  ).run({ id, userId, name, targetPerWeek, createdAt: nowIso() });

  logEvent(userId, "habit", id, "create", null, {
    name,
    targetPerWeek,
    archived: 0,
  });

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
    .prepare("SELECT * FROM Habit WHERE id = @id AND userId = @userId")
    .get({ id, userId }) as Record<string, unknown> | undefined;
  if (!existing) return fail("not_found");

  if (data.name !== undefined && !data.name.trim()) return fail("invalid_name");

  const fields: string[] = [];
  const params: Record<string, string | number | null> = { id, userId };
  const changes: Record<string, unknown> = {};

  if (data.name !== undefined) {
    fields.push("name = @name");
    params.name = data.name.trim();
    changes.name = data.name.trim();
  }
  if (data.targetPerWeek !== undefined) {
    const clamped = Math.max(1, Math.min(7, Math.round(data.targetPerWeek)));
    fields.push("targetPerWeek = @targetPerWeek");
    params.targetPerWeek = clamped;
    changes.targetPerWeek = clamped;
  }
  if (data.archived !== undefined) {
    fields.push("archived = @archived");
    params.archived = data.archived ? 1 : 0;
    changes.archived = data.archived ? 1 : 0;
  }
  if (fields.length === 0) return fail("no_fields");

  db.prepare(`UPDATE Habit SET ${fields.join(", ")} WHERE id = @id AND userId = @userId`).run(params);

  logEvent(userId, "habit", id, "update", habitSnapshot(existing), changes);

  revalidate();
  return { ok: true, data: undefined };
}

export function toggleHabitRecord(
  userId: string,
  habitId: string,
  date?: Date,
): ServiceResult<{ recorded: boolean; date: string }> {
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

    logEvent(userId, "habit", habitId, "uncheck", { date: dateStr }, null);

    revalidate();
    return { ok: true, data: { recorded: false, date: dateStr } };
  }

  db.prepare(
    `INSERT OR IGNORE INTO HabitRecord (id, habitId, date, createdAt)
     VALUES (@id, @habitId, @date, @createdAt)`,
  ).run({ id: cuid(), habitId, date: dateStr, createdAt: nowIso() });

  logEvent(userId, "habit", habitId, "check", null, { date: dateStr });

  revalidate();
  return { ok: true, data: { recorded: true, date: dateStr } };
}

export function deleteHabit(userId: string, id: string): ServiceResult<undefined> {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM Habit WHERE id = @id AND userId = @userId")
    .get({ id, userId }) as Record<string, unknown> | undefined;
  if (!existing) return fail("not_found");

  db.prepare("DELETE FROM Habit WHERE id = @id AND userId = @userId").run({ id, userId });

  logEvent(userId, "habit", id, "delete", habitSnapshot(existing), null);

  revalidate();
  return { ok: true, data: undefined };
}

// ---------- Daily ----------

export interface DailyEntry {
  id: string;
  date: string;
  focus: string | null;
  win: string | null;
  improve: string | null;
  nextStep: string | null;
}

export interface UpsertDailyInput {
  focus?: string | null;
  win?: string | null;
  improve?: string | null;
  nextStep?: string | null;
}

export function upsertDaily(
  userId: string,
  date: string,
  data: UpsertDailyInput,
): ServiceResult<{ id: string }> {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM Daily WHERE userId = @userId AND date = @date")
    .get({ userId, date }) as { id: string } | undefined;

  const fields: string[] = [];
  const params: Record<string, string | null> = { userId, date };

  if (data.focus !== undefined) {
    fields.push("focus = @focus");
    params.focus = data.focus?.trim() || null;
  }
  if (data.win !== undefined) {
    fields.push("win = @win");
    params.win = data.win?.trim() || null;
  }
  if (data.improve !== undefined) {
    fields.push("improve = @improve");
    params.improve = data.improve?.trim() || null;
  }
  if (data.nextStep !== undefined) {
    fields.push("nextStep = @nextStep");
    params.nextStep = data.nextStep?.trim() || null;
  }

  if (fields.length === 0) return fail("no_fields");

  let id: string;
  if (existing) {
    id = existing.id;
    params.id = id;
    fields.push("updatedAt = datetime('now')");
    db.prepare(`UPDATE Daily SET ${fields.join(", ")} WHERE id = @id`).run(params);
  } else {
    id = cuid();
    params.id = id;
    db.prepare(
      `INSERT INTO Daily (id, userId, date, focus, win, improve, nextStep, createdAt, updatedAt)
       VALUES (@id, @userId, @date, @focus, @win, @improve, @nextStep, datetime('now'), datetime('now'))`,
    ).run({
      id,
      userId,
      date,
      focus: data.focus?.trim() || null,
      win: data.win?.trim() || null,
      improve: data.improve?.trim() || null,
      nextStep: data.nextStep?.trim() || null,
    });
  }

  revalidate();
  return { ok: true, data: { id } };
}

export function getDaily(userId: string, date: string): DailyEntry | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM Daily WHERE userId = @userId AND date = @date")
    .get({ userId, date }) as
    | {
        id: string;
        date: string;
        focus: string | null;
        win: string | null;
        improve: string | null;
        nextStep: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    focus: row.focus,
    win: row.win,
    improve: row.improve,
    nextStep: row.nextStep,
  };
}

export function getRecentDailies(userId: string, limit = 7): DailyEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM Daily WHERE userId = @userId
       ORDER BY date DESC LIMIT @limit`,
    )
    .all({ userId, limit }) as {
    id: string;
    date: string;
    focus: string | null;
    win: string | null;
    improve: string | null;
    nextStep: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    focus: r.focus,
    win: r.win,
    improve: r.improve,
    nextStep: r.nextStep,
  }));
}

export { parseChecklist };
