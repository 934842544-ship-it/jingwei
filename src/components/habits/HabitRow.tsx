"use client";

import { useOptimistic, useTransition } from "react";
import { toggleHabitRecord } from "@/app/actions/habits";
import { computeStreaks } from "@/lib/streaks";
import { toDateString } from "@/lib/date";
import Heatmap from "./Heatmap";

export default function HabitRow({
  id,
  name,
  targetPerWeek,
  records,
  today,
}: {
  id: string;
  name: string;
  targetPerWeek: number;
  records: string[];
  today: Date;
}) {
  const [optimisticRecords, setOptimisticRecords] = useOptimistic(
    new Set(records),
  );
  const [isPending, startTransition] = useTransition();

  const todayStr = toDateString(today);
  const checkedToday = optimisticRecords.has(todayStr);
  const streaks = computeStreaks(optimisticRecords, today);

  async function handleToggle() {
    const nextSet = new Set(optimisticRecords);
    if (nextSet.has(todayStr)) {
      nextSet.delete(todayStr);
    } else {
      nextSet.add(todayStr);
    }
    startTransition(async () => {
      setOptimisticRecords(nextSet);
      await toggleHabitRecord(id, today);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 border-b border-hairline py-5 md:grid-cols-12 md:items-center">
      <div className="md:col-span-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-semibold text-ink">{name}</h3>
          <span className="nums text-4xl font-bold text-accent">
            {streaks.current}
            <span className="text-base font-medium"> 天</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-2">
          目标每周 {targetPerWeek} 天 · 最长 {streaks.longest} 天
        </p>
      </div>
      <div className="md:col-span-7">
        <Heatmap dates={optimisticRecords} today={today} />
      </div>
      <div className="md:col-span-2 md:text-right">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`w-full border px-4 py-2 text-sm font-semibold ${
            checkedToday
              ? "border-accent bg-accent text-white"
              : "border-hairline bg-paper text-ink hover:border-ink"
          }`}
        >
          {checkedToday ? "今日已打卡" : "今日打卡"}
        </button>
      </div>
    </div>
  );
}
