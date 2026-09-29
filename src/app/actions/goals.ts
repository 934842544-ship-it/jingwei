"use server";

import { requireUser } from "@/lib/auth/user";
import {
  createGoal as createGoalInDb,
  updateGoal as updateGoalInDb,
  setManualProgress as setManualProgressInDb,
  deleteGoal as deleteGoalInDb,
} from "@/lib/services";

export async function createGoal(formData: FormData) {
  const user = await requireUser();
  createGoalInDb(user.id, {
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? null,
    deadline: (formData.get("deadline") as string) ?? null,
  });
}

export async function updateGoal(id: string, data: {
  title?: string;
  description?: string | null;
  deadline?: string | null;
  status?: "ACTIVE" | "DONE" | "ARCHIVED";
  manualProgress?: number;
}) {
  const user = await requireUser();
  updateGoalInDb(user.id, id, data);
}

export async function setManualProgress(id: string, progress: number) {
  const user = await requireUser();
  setManualProgressInDb(user.id, id, progress);
}

export async function deleteGoal(id: string) {
  const user = await requireUser();
  deleteGoalInDb(user.id, id);
}
