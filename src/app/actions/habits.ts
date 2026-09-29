"use server";

import { revalidatePath } from "next/cache";
import { getDb, cuid, nowIso } from "@/lib/db";
import { toDateString, startOfDay } from "@/lib/date";

export async function createHabit(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const targetRaw = Number(formData.get("targetPerWeek"));
  const targetPerWeek = Number.isFinite(targetRaw)
    ? Math.max(1, Math.min(7, Math.round(targetRaw)))
    : 7;

  const db = getDb();
  const id = cuid();
  db.prepare(
    `INSERT INTO Habit (id, name, targetPerWeek, createdAt) VALUES (@id, @name, @targetPerWeek, @createdAt)`,
  ).run({ id, name, targetPerWeek, createdAt: nowIso() });

  revalidatePath("/", "layout");
}

export async function updateHabit(id: string, data: {
  name?: string;
  targetPerWeek?: number;
  archived?: boolean;
}) {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM Habit WHERE id = @id").get({ id });
  if (!existing) return;

  const fields: string[] = [];
  const params: Record<string, any> = { id };

  if (data.name !== undefined) {
    fields.push("name = @name");
    params.name = data.name;
  }
  if (data.targetPerWeek !== undefined) {
    fields.push("targetPerWeek = @targetPerWeek");
    params.targetPerWeek = Math.max(1, Math.min(7, Math.round(data.targetPerWeek)));
  }
  if (data.archived !== undefined) {
    fields.push("archived = @archived");
    params.archived = data.archived ? 1 : 0;
  }
  if (fields.length === 0) return;

  db.prepare(`UPDATE Habit SET ${fields.join(", ")} WHERE id = @id`).run(params);
  revalidatePath("/", "layout");
}

export async function toggleHabitRecord(
  habitId: string,
  date?: Date,
): Promise<boolean> {
  const db = getDb();
  const dateStr = toDateString(startOfDay(date ?? new Date()));

  const existing = db
    .prepare("SELECT id FROM HabitRecord WHERE habitId = @habitId AND date = @date")
    .get({ habitId, date: dateStr });

  if (existing) {
    db.prepare("DELETE FROM HabitRecord WHERE habitId = @habitId AND date = @date")
      .run({ habitId, date: dateStr });
    revalidatePath("/", "layout");
    return false;
  } else {
    const id = cuid();
    db.prepare(
      `INSERT OR IGNORE INTO HabitRecord (id, habitId, date, createdAt) VALUES (@id, @habitId, @date, @createdAt)`,
    ).run({ id, habitId, date: dateStr, createdAt: nowIso() });
    revalidatePath("/", "layout");
    return true;
  }
}

export async function deleteHabit(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM Habit WHERE id = @id").run({ id });
  revalidatePath("/", "layout");
}
