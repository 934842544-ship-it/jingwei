"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleTaskDone, deleteTask } from "@/app/actions/tasks";
import type { TaskWithGoal } from "@/lib/queries";
import { dueLabel, isSameDay } from "@/lib/date";
import Checklist from "./Checklist";

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "高",
  NORMAL: "中",
  LOW: "低",
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "bg-accent text-white",
  NORMAL: "bg-hairline text-ink",
  LOW: "bg-hairline text-ink-2",
};

export default function TaskItem({
  task,
  today,
  showGoal = true,
  showChecklist = true,
}: {
  task: TaskWithGoal;
  today: Date;
  showGoal?: boolean;
  showChecklist?: boolean;
}) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(task.done);
  const [isPending, startTransition] = useTransition();
  const [hover, setHover] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const overdue =
    !task.done &&
    task.status !== "DONE" &&
    task.dueDate &&
    task.dueDate < today &&
    !isSameDay(task.dueDate, today);

  const isWaiting = task.status === "WAITING";
  const followUpOverdue =
    isWaiting &&
    task.followUpDate &&
    task.followUpDate <= today &&
    !isSameDay(task.followUpDate, today);

  const checklistItems = task.checklist ?? [];
  const checklistDone = checklistItems.filter((i) => i.done).length;
  const hasChecklist = checklistItems.length > 0;

  async function handleToggle() {
    const next = !optimisticDone;
    startTransition(async () => {
      setOptimisticDone(next);
      await toggleTaskDone(task.id);
    });
  }

  async function handleDelete() {
    if (!confirm("删除该任务？")) return;
    startTransition(async () => {
      await deleteTask(task.id);
    });
  }

  const displayDone = optimisticDone || task.status === "DONE";

  return (
    <div
      className={`group border-b border-hairline px-1 py-3 ${
        isWaiting ? "bg-paper-2" : ""
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={displayDone}
          onChange={handleToggle}
          disabled={isPending || isWaiting}
          className="mt-1 h-4 w-4 cursor-pointer accent-accent disabled:cursor-not-allowed"
          aria-label={displayDone ? "标记为未完成" : "标记为完成"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p
              className={`min-w-0 flex-1 truncate text-sm ${
                displayDone
                  ? "text-ink-2 line-through"
                  : isWaiting
                    ? "text-ink-2"
                    : "text-ink"
              }`}
            >
              {task.title}
            </p>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_COLOR[task.priority]}`}
            >
              {PRIORITY_LABEL[task.priority]}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2">
            {isWaiting ? (
              <span className="font-semibold text-amber-600">
                等待中
              </span>
            ) : null}
            {task.dueDate ? (
              <span className={overdue ? "text-accent font-semibold" : ""}>
                {dueLabel(task.dueDate, today)}
              </span>
            ) : null}
            {task.estimatedMinutes ? (
              <span>约 {task.estimatedMinutes} 分钟</span>
            ) : null}
            {showGoal && task.goal ? (
              <span className="truncate">{task.goal.title}</span>
            ) : null}
            {hasChecklist ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-accent hover:underline"
              >
                子任务 {checklistDone}/{checklistItems.length}
              </button>
            ) : null}
          </div>
          {isWaiting && task.waitingOn ? (
            <div className="mt-1 text-xs text-ink-2">
              <span className="text-amber-600">等：</span>
              {task.waitingOn}
              {task.followUpDate ? (
                <span
                  className={`ml-2 ${followUpOverdue ? "text-accent font-semibold" : ""}`}
                >
                  跟进：{dueLabel(task.followUpDate, today)}
                </span>
              ) : null}
            </div>
          ) : null}
          {task.notes ? (
            <p className="mt-1 line-clamp-2 text-xs text-ink-2">{task.notes}</p>
          ) : null}
        </div>
        {hover ? (
          <button
            onClick={handleDelete}
            className="shrink-0 text-xs text-ink-2 hover:text-accent"
          >
            删除
          </button>
        ) : null}
      </div>
      {showChecklist && hasChecklist && expanded ? (
        <Checklist taskId={task.id} items={checklistItems} />
      ) : null}
    </div>
  );
}
