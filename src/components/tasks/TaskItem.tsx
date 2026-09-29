"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleTaskDone, deleteTask } from "@/app/actions/tasks";
import type { TaskWithGoal } from "@/lib/queries";
import { dueLabel, isSameDay } from "@/lib/date";

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "高",
  NORMAL: "中",
  LOW: "低",
};

export default function TaskItem({
  task,
  today,
  showGoal = true,
}: {
  task: TaskWithGoal;
  today: Date;
  showGoal?: boolean;
}) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(task.done);
  const [isPending, startTransition] = useTransition();
  const [hover, setHover] = useState(false);

  const overdue =
    !task.done && task.dueDate && task.dueDate < today &&
    !isSameDay(task.dueDate, today);

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

  return (
    <div
      className="group flex items-start gap-3 border-b border-hairline px-1 py-3"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <input
        type="checkbox"
        checked={optimisticDone}
        onChange={handleToggle}
        disabled={isPending}
        className="mt-1 h-4 w-4 cursor-pointer accent-accent"
        aria-label={optimisticDone ? "标记为未完成" : "标记为完成"}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            optimisticDone ? "text-ink-2 line-through" : "text-ink"
          }`}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2">
          <span>优先级 {PRIORITY_LABEL[task.priority]}</span>
          {task.dueDate ? (
            <span className={overdue ? "text-accent font-semibold" : ""}>
              {dueLabel(task.dueDate, today)}
            </span>
          ) : null}
          {showGoal && task.goal ? (
            <span className="truncate">{task.goal.title}</span>
          ) : null}
        </div>
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
  );
}
