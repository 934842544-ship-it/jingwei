"use server";

import { revalidatePath } from "next/cache";
import { getDb, cuid, nowIso } from "@/lib/db";

export async function createTask(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const notes = (formData.get("notes") as string)?.trim() || null;
  const goalId = (formData.get("goalId") as string)?.trim() || null;
  const priority = (formData.get("priority") as string)?.trim() || "NORMAL";
  const dueDate = (formData.get("dueDate") as string)?.trim() || null;

  const db = getDb();
  const id = cuid();
  const now = nowIso();
  db.prepare(
    `INSERT INTO Task (id, title, notes, goalId, priority, dueDate, done, createdAt, updatedAt)
     VALUES (@id, @title, @notes, @goalId, @priority, @dueDate, 0, @createdAt, @updatedAt)`,
  ).run({ id, title, notes, goalId, priority, dueDate, createdAt: now, updatedAt: now });

  revalidatePath("/", "layout");
}

export async function toggleTaskDone(id: string): Promise<boolean> {
  const db = getDb();
  const task = db.prepare("SELECT done FROM Task WHERE id = @id").get({ id }) as
    | { done: number }
    | undefined;
  if (!task) return false;

  const newDone = task.done ? 0 : 1;
  const doneAt = newDone ? nowIso() : null;

  db.prepare(
    `UPDATE Task SET done = @done, doneAt = @doneAt, updatedAt = datetime('now') WHERE id = @id`,
  ).run({ id, done: newDone, doneAt });

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
  const db = getDb();
  const existing = db.prepare("SELECT id FROM Task WHERE id = @id").get({ id });
  if (!existing) return;

  const fields: string[] = [];
  const params: Record<string, any> = { id };

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
  db.prepare(`UPDATE Task SET ${fields.join(", ")} WHERE id = @id`).run(params);
  revalidatePath("/", "layout");
}

export async function deleteTask(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM Task WHERE id = @id").run({ id });
  revalidatePath("/", "layout");
}
