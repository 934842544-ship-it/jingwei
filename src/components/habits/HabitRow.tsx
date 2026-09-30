"use client";

import { useOptimistic, useTransition, useState } from "react";
import { toggleHabitRecord } from "@/app/actions/habits";
import { computeStreaks } from "@/lib/streaks";
import { toDateString, startOfWeek, addDays } from "@/lib/date";
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
  const [expanded, setExpanded] = useState(false);

  const todayStr = toDateString(today);
  const checkedToday = optimisticRecords.has(todayStr);
  const streaks = computeStreaks(optimisticRecords, today);

  const weekStart = startOfWeek(today);
  let thisWeekCount = 0;
  for (let i = 0; i < 7; i++) {
    if (optimisticRecords.has(toDateString(addDays(weekStart, i)))) {
      thisWeekCount += 1;
    }
  }

  const brokenStreak = streaks.current === 0 && streaks.longest > 0;
  const daysSinceLast = computeDaysSinceLast(optimisticRecords, today);
  const isBroken = daysSinceLast >= 3;

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
    <div
      className={`border-b border-hairline py-5 ${
        isBroken ? "opacity-50" : ""
      }`}
    >
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="md:col-span-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-semibold text-ink">{name}</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-lg">🔥</span>
              <span className="nums text-4xl font-bold text-accent">
                {streaks.current}
              </span>
              <span className="text-sm font-medium text-ink-2"> 天</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-ink-2">
            本周 {thisWeekCount}/{targetPerWeek} · 最长 {streaks.longest} 天
            {isBroken ? (
              <span className="ml-2 text-accent">已断档 {daysSinceLast} 天</span>
            ) : null}
          </p>
        </div>
        <div className="md:col-span-6">
          <Heatmap dates={optimisticRecords} today={today} />
        </div>
        <div className="md:col-span-2 md:text-right">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
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
    </div>
  );
}

function computeDaysSinceLast(records: Set<string>, today: Date): number {
  let days = 0;
  let cursor = new Date(today);
  while (days < 365) {
    if (records.has(toDateString(cursor))) return days;
    cursor = addDays(cursor, -1);
    days += 1;
  }
  return days;
}
