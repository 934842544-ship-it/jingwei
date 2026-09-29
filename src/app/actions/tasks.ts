"use server";

import { requireUser } from "@/lib/auth/user";
import {
  createTask as createTaskInDb,
  updateTask as updateTaskInDb,
  toggleTaskDone as toggleTaskDoneInDb,
  deleteTask as deleteTaskInDb,
} from "@/lib/services";

export async function createTask(formData: FormData) {
  const user = await requireUser();
  createTaskInDb(user.id, {
    title: (formData.get("title") as string) ?? "",
    notes: (formData.get("notes") as string) ?? null,
    goalId: (formData.get("goalId") as string) ?? null,
    priority: (formData.get("priority") as string) ?? null,
    dueDate: (formData.get("dueDate") as string) ?? null,
  });
}

export async function toggleTaskDone(id: string): Promise<boolean> {
  const user = await requireUser();
  const result = toggleTaskDoneInDb(user.id, id);
  return result.ok ? result.data.done : false;
}

export async function updateTask(id: string, data: {
  title?: string;
  notes?: string | null;
  goalId?: string | null;
  priority?: "HIGH" | "NORMAL" | "LOW";
  dueDate?: string | null;
}) {
  const user = await requireUser();
  updateTaskInDb(user.id, id, data);
}

export async function deleteTask(id: string) {
  const user = await requireUser();
  deleteTaskInDb(user.id, id);
}
