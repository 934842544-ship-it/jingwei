"use server";

import { revalidatePath } from "next/cache";
import { getDb, cuid, nowIso } from "@/lib/db";
import { requireUser } from "@/lib/auth/user";

export async function createGoal(formData: FormData) {
  const user = await requireUser();
  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const description = (formData.get("description") as string)?.trim() || null;
  const deadline = (formData.get("deadline") as string)?.trim() || null;

  const db = getDb();
  const id = cuid();
  const now = nowIso();
  db.prepare(
    `INSERT INTO Goal (id, userId, title, description, deadline, status, manualProgress, createdAt, updatedAt)
     VALUES (@id, @userId, @title, @description, @deadline, 'ACTIVE', 0, @createdAt, @updatedAt)`,
  ).run({ id, userId: user.id, title, description, deadline, createdAt: now, updatedAt: now });

  revalidatePath("/", "layout");
}

export async function updateGoal(id: string, data: {
  title?: string;
  description?: string | null;
  deadline?: string | null;
  status?: "ACTIVE" | "DONE" | "ARCHIVED";
  manualProgress?: number;
}) {
  const user = await requireUser();
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM Goal WHERE id = @id AND userId = @userId")
    .get({ id, userId: user.id });
  if (!existing) return;

  const fields: string[] = [];
  const params: Record<string, string | number | null> = { id, userId: user.id };

  if (data.title !== undefined) {
    fields.push("title = @title");
    params.title = data.title;
  }
  if (data.description !== undefined) {
    fields.push("description = @description");
    params.description = data.description;
  }
  if (data.deadline !== undefined) {
    fields.push("deadline = @deadline");
    params.deadline = data.deadline;
  }
  if (data.status !== undefined) {
    fields.push("status = @status");
    params.status = data.status;
  }
  if (data.manualProgress !== undefined) {
    fields.push("manualProgress = @manualProgress");
    params.manualProgress = Math.max(0, Math.min(100, data.manualProgress));
  }
  if (fields.length === 0) return;

  fields.push("updatedAt = datetime('now')");
  db.prepare(`UPDATE Goal SET ${fields.join(", ")} WHERE id = @id AND userId = @userId`).run(params);
  revalidatePath("/", "layout");
}

export async function setManualProgress(id: string, progress: number) {
  const user = await requireUser();
  const db = getDb();
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  db.prepare(
    `UPDATE Goal SET manualProgress = @progress, updatedAt = datetime('now')
     WHERE id = @id AND userId = @userId`,
  ).run({ id, userId: user.id, progress: clamped });
  revalidatePath("/", "layout");
}

export async function deleteGoal(id: string) {
  const user = await requireUser();
  const db = getDb();
  db.prepare("DELETE FROM Goal WHERE id = @id AND userId = @userId").run({ id, userId: user.id });
  revalidatePath("/", "layout");
}
