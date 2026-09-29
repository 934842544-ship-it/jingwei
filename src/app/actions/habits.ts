"use server";

import { requireUser } from "@/lib/auth/user";
import {
  createHabit as createHabitInDb,
  updateHabit as updateHabitInDb,
  toggleHabitRecord as toggleHabitRecordInDb,
  deleteHabit as deleteHabitInDb,
} from "@/lib/services";

export async function createHabit(formData: FormData) {
  const user = await requireUser();
  createHabitInDb(user.id, {
    name: (formData.get("name") as string) ?? "",
    targetPerWeek: Number(formData.get("targetPerWeek")),
  });
}

export async function updateHabit(id: string, data: {
  name?: string;
  targetPerWeek?: number;
  archived?: boolean;
}) {
  const user = await requireUser();
  updateHabitInDb(user.id, id, data);
}

export async function toggleHabitRecord(
  habitId: string,
  date?: Date,
): Promise<boolean> {
  const user = await requireUser();
  const result = toggleHabitRecordInDb(user.id, habitId, date);
  return result.ok ? result.data.recorded : false;
}

export async function deleteHabit(id: string) {
  const user = await requireUser();
  deleteHabitInDb(user.id, id);
}
