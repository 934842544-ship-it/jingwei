"use client";

import { useState, useTransition } from "react";
import { setDailyFocus } from "@/app/actions/daily";
import type { DailyEntry } from "@/lib/services";

export default function DailyFocus({
  daily,
  date,
}: {
  daily: DailyEntry | null;
  date: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [focusText, setFocusText] = useState(daily?.focus ?? "");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("focus", focusText);
    formData.set("date", date);
    startTransition(async () => {
      await setDailyFocus(formData);
      setIsEditing(false);
    });
  }

  if (!daily?.focus && !isEditing) {
    return (
      <div
        className="border border-hairline p-5 text-center"
      >
        <p className="text-sm text-ink-2">未设置今日焦点</p>
        <button
          onClick={() => setIsEditing(true)}
          className="mt-3 text-sm font-semibold text-accent hover:underline"
        >
          + 设置今日焦点
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="border border-hairline p-5">
        <label className="block text-xs font-semibold text-ink-2">
          今日焦点
          <input
            type="text"
            value={focusText}
            onChange={(e) => setFocusText(e.target.value)}
            placeholder="今天唯一必须赢的事是什么？"
            className="mt-2 w-full border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            autoFocus
          />
        </label>
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setFocusText(daily?.focus ?? "");
            }}
            className="px-4 py-2 text-sm text-ink-2 hover:text-ink"
          >
            取消
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className="border border-accent/30 bg-accent/5 p-5"
    >
      <p className="text-xs font-semibold tracking-widest text-accent">
        今日焦点
      </p>
      <p className="mt-2 text-lg font-semibold text-ink">{daily?.focus}</p>
      <button
        onClick={() => {
          setFocusText(daily?.focus ?? "");
          setIsEditing(true);
        }}
        className="mt-2 text-xs text-ink-2 hover:text-accent"
      >
        修改
      </button>
    </div>
  );
}
