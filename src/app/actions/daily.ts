"use server";

import { requireUser } from "@/lib/auth/user";
import {
  upsertDaily as upsertDailyInDb,
} from "@/lib/services";
import { toDateString, startOfDay, getShanghaiToday } from "@/lib/date";

export async function setDailyFocus(formData: FormData) {
  const user = await requireUser();
  const focus = (formData.get("focus") as string) ?? "";
  const dateStr = (formData.get("date") as string) ?? null;
  const date = dateStr
    ? toDateString(startOfDay(new Date(dateStr)))
    : toDateString(startOfDay(getShanghaiToday()));
  upsertDailyInDb(user.id, date, { focus });
}

export async function setDailyReflection(formData: FormData) {
  const user = await requireUser();
  const win = (formData.get("win") as string) ?? null;
  const improve = (formData.get("improve") as string) ?? null;
  const nextStep = (formData.get("nextStep") as string) ?? null;
  const dateStr = (formData.get("date") as string) ?? null;
  const date = dateStr
    ? toDateString(startOfDay(new Date(dateStr)))
    : toDateString(startOfDay(getShanghaiToday()));
  upsertDailyInDb(user.id, date, {
    win: win ?? undefined,
    improve: improve ?? undefined,
    nextStep: nextStep ?? undefined,
  });
}
