"use client";

import { useState } from "react";
import Link from "next/link";
import type { GoalWithStats } from "@/lib/queries";
import { formatDisplayDate } from "@/lib/date";

export default function GoalCard({
  goal,
  childrenGoals = [],
}: {
  goal: GoalWithStats;
  childrenGoals?: GoalWithStats[];
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = childrenGoals.length > 0;

  const now = new Date();
  const deadlineSoon =
    goal.deadline &&
    goal.status === "ACTIVE" &&
    goal.deadline > now &&
    goal.deadline.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
  const deadlineOverdue =
    goal.deadline && goal.status === "ACTIVE" && goal.deadline < now;

  return (
    <div>
      <Link
        href={`/goals/${goal.id}`}
        className={`block border p-5 transition-colors hover:border-ink ${
          deadlineOverdue
            ? "border-accent/50 bg-accent/5"
            : deadlineSoon
              ? "border-amber-400/50 bg-amber-50"
              : "border-hairline"
        }`}
      >
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setExpanded(!expanded);
                  }}
                  className="text-ink-2 hover:text-ink"
                >
                  {expanded ? "▾" : "▸"}
                </button>
              ) : (
                <span className="w-4" />
              )}
              <h3 className="truncate font-semibold text-ink">{goal.title}</h3>
            </div>
            <p className="mt-1 ml-6 text-xs text-ink-2">
              {goal.progressMode === "AUTO" ? "自动进度" : "手动进度"}
            </p>
          </div>
          <span className="nums shrink-0 text-5xl font-bold text-accent">
            {goal.displayProgress}
            <span className="text-xl font-medium">%</span>
          </span>
        </div>
        <div className="mt-3 ml-6 flex flex-wrap gap-4 text-xs text-ink-2">
          <span>
            任务 {goal.taskDone}/{goal.taskTotal}
          </span>
          {hasChildren ? (
            <span>子目标 {goal.childDone}/{goal.childTotal}</span>
          ) : null}
          {goal.deadline ? (
            <span
              className={
                deadlineOverdue
                  ? "text-accent font-semibold"
                  : deadlineSoon
                    ? "text-amber-600 font-semibold"
                    : ""
              }
            >
              截止 {formatDisplayDate(goal.deadline)}
            </span>
          ) : null}
        </div>
      </Link>
      {hasChildren && expanded ? (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-hairline pl-4">
          {childrenGoals.map((child) => (
            <Link
              key={child.id}
              href={`/goals/${child.id}`}
              className="block border border-hairline p-3 text-sm hover:border-ink"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium text-ink">
                  {child.title}
                </span>
                <span className="nums shrink-0 text-xl font-bold text-accent">
                  {child.displayProgress}%
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-2">
                任务 {child.taskDone}/{child.taskTotal}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
