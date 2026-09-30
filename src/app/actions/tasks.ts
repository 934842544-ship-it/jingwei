"use server";

import { requireUser } from "@/lib/auth/user";
import {
  createTask as createTaskInDb,
  updateTask as updateTaskInDb,
  toggleTaskDone as toggleTaskDoneInDb,
  deleteTask as deleteTaskInDb,
  addChecklistItem as addChecklistItemInDb,
  toggleChecklistItem as toggleChecklistItemInDb,
  removeChecklistItem as removeChecklistItemInDb,
} from "@/lib/services";

export async function createTask(formData: FormData) {
  const user = await requireUser();
  const estimatedMinutesStr = formData.get("estimatedMinutes") as string;
  const estimatedMinutes = estimatedMinutesStr && !isNaN(Number(estimatedMinutesStr))
    ? Number(estimatedMinutesStr)
    : null;
  createTaskInDb(user.id, {
    title: (formData.get("title") as string) ?? "",
    notes: (formData.get("notes") as string) ?? null,
    goalId: (formData.get("goalId") as string) ?? null,
    priority: (formData.get("priority") as string) ?? null,
    dueDate: (formData.get("dueDate") as string) ?? null,
    plannedDate: (formData.get("plannedDate") as string) ?? null,
    estimatedMinutes,
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
  plannedDate?: string | null;
  status?: "OPEN" | "WAITING" | "DONE";
  waitingOn?: string | null;
  followUpDate?: string | null;
  estimatedMinutes?: number | null;
}) {
  const user = await requireUser();
  updateTaskInDb(user.id, id, data);
}

export async function deleteTask(id: string) {
  const user = await requireUser();
  deleteTaskInDb(user.id, id);
}

export async function addChecklistItem(taskId: string, text: string) {
  const user = await requireUser();
  return addChecklistItemInDb(user.id, taskId, text);
}

export async function toggleChecklistItem(taskId: string, itemId: string) {
  const user = await requireUser();
  return toggleChecklistItemInDb(user.id, taskId, itemId);
}

export async function removeChecklistItem(taskId: string, itemId: string) {
  const user = await requireUser();
  return removeChecklistItemInDb(user.id, taskId, itemId);
}

