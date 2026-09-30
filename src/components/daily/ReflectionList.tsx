"use client";

import { useState } from "react";
import type { DailyEntry } from "@/lib/services";

export default function ReflectionList({
  dailies,
  todayStr,
}: {
  dailies: DailyEntry[];
  todayStr: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const dailyMap = new Map(dailies.map((d) => [d.date, d]));

  const dates: string[] = [];
  const today = new Date(todayStr);
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  return (
    <div className="border border-hairline">
      {dates.map((date) => {
        const daily = dailyMap.get(date);
        const hasContent = daily && (daily.win || daily.improve || daily.nextStep);
        const isToday = date === todayStr;
        const expanded = expandedId === date;

        return (
          <div
            key={date}
            className="border-b border-hairline last:border-b-0"
          >
            <button
              onClick={() => setExpandedId(expanded ? null : date)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-ink-5"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm ${
                    hasContent ? "text-ink font-medium" : "text-ink-2"
                  }`}
                >
                  {date}
                </span>
                {isToday ? (
                  <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                    今天
                  </span>
                ) : null}
                {hasContent ? (
                  <span className="text-xs text-accent">✓ 已写</span>
                ) : (
                  <span className="text-xs text-ink-2">未写</span>
                )}
              </div>
              <span className="text-ink-2">{expanded ? "▾" : "▸"}</span>
            </button>
            {expanded && daily ? (
              <div className="space-y-3 border-t border-hairline bg-ink-5/50 px-4 py-4 text-sm">
                {daily.focus ? (
                  <div>
                    <div className="text-xs font-semibold text-ink-2">
                      今日焦点
                    </div>
                    <p className="mt-1 text-ink">{daily.focus}</p>
                  </div>
                ) : null}
                {daily.win ? (
                  <div>
                    <div className="text-xs font-semibold text-accent">
                      进步
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-ink">
                      {daily.win}
                    </p>
                  </div>
                ) : null}
                {daily.improve ? (
                  <div>
                    <div className="text-xs font-semibold text-ink-2">
                      需精进
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-ink">
                      {daily.improve}
                    </p>
                  </div>
                ) : null}
                {daily.nextStep ? (
                  <div>
                    <div className="text-xs font-semibold text-ink-2">
                      下一步
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-ink">
                      {daily.nextStep}
                    </p>
                  </div>
                ) : null}
                {!daily.win && !daily.improve && !daily.nextStep ? (
                  <p className="text-ink-2">这天没有写复盘。</p>
                ) : null}
              </div>
            ) : expanded ? (
              <div className="border-t border-hairline bg-ink-5/50 px-4 py-4 text-sm text-ink-2">
                这天没有写复盘。
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
