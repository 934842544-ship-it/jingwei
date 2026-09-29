"use server";

import { revalidatePath } from "next/cache";
import { getDb, cuid, nowIso } from "@/lib/db";
import { requireUser } from "@/lib/auth/user";

export async function createTask(formData: FormData) {
  const user = await requireUser();
  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const notes = (formData.get("notes") as string)?.trim() || null;
  const goalId = (formData.get("goalId") as string)?.trim() || null;
  const priority = (formData.get("priority") as string)?.trim() || "NORMAL";
  const dueDate = (formData.get("dueDate") as string)?.trim() || null;

  const db = getDb();
  if (goalId) {
    const goal = db
      .prepare("SELECT id FROM Goal WHERE id = @goalId AND userId = @userId")
      .get({ goalId, userId: user.id });
    if (!goal) return;
  }

  const id = cuid();
  const now = nowIso();
  db.prepare(
    `INSERT INTO Task (id, userId, title, notes, goalId, priority, dueDate, done, createdAt, updatedAt)
     VALUES (@id, @userId, @title, @notes, @goalId, @priority, @dueDate, 0, @createdAt, @updatedAt)`,
  ).run({ id, userId: user.id, title, notes, goalId, priority, dueDate, createdAt: now, updatedAt: now });

  revalidatePath("/", "layout");
}

export async function toggleTaskDone(id: string): Promise<boolean> {
  const user = await requireUser();
  const db = getDb();
  const task = db
    .prepare("SELECT done FROM Task WHERE id = @id AND userId = @userId")
    .get({ id, userId: user.id }) as
    | { done: number }
    | undefined;
  if (!task) return false;

  const newDone = task.done ? 0 : 1;
  const doneAt = newDone ? nowIso() : null;

  db.prepare(
    `UPDATE Task SET done = @done, doneAt = @doneAt, updatedAt = datetime('now')
     WHERE id = @id AND userId = @userId`,
  ).run({ id, userId: user.id, done: newDone, doneAt });

  revalidatePath("/", "layout");
  return !!newDone;
}

export async function updateTask(id: string, data: {
  title?: string;
  notes?: string | null;
  goalId?: string | null;
  priority?: "HIGH" | "NORMAL" | "LOW";
  dueDate?: string | null;
}) {
  const user = await requireUser();
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM Task WHERE id = @id AND userId = @userId")
    .get({ id, userId: user.id });
  if (!existing) return;

  if (data.goalId !== undefined && data.goalId !== null) {
    const goal = db
      .prepare("SELECT id FROM Goal WHERE id = @goalId AND userId = @userId")
      .get({ goalId: data.goalId, userId: user.id });
    if (!goal) return;
  }

  const fields: string[] = [];
  const params: Record<string, string | number | null> = { id, userId: user.id };

  if (data.title !== undefined) {
    fields.push("title = @title");
    params.title = data.title;
  }
  if (data.notes !== undefined) {
    fields.push("notes = @notes");
    params.notes = data.notes;
  }
  if (data.goalId !== undefined) {
    fields.push("goalId = @goalId");
    params.goalId = data.goalId;
  }
  if (data.priority !== undefined) {
    fields.push("priority = @priority");
    params.priority = data.priority;
  }
  if (data.dueDate !== undefined) {
    fields.push("dueDate = @dueDate");
    params.dueDate = data.dueDate;
  }
  if (fields.length === 0) return;

  fields.push("updatedAt = datetime('now')");
  db.prepare(`UPDATE Task SET ${fields.join(", ")} WHERE id = @id AND userId = @userId`).run(params);
  revalidatePath("/", "layout");
}

export async function deleteTask(id: string) {
  const user = await requireUser();
  const db = getDb();
  db.prepare("DELETE FROM Task WHERE id = @id AND userId = @userId").run({ id, userId: user.id });
  revalidatePath("/", "layout");
}
