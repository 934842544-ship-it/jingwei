import Link from "next/link";
import type { GoalWithStats } from "@/lib/queries";
import { formatDisplayDate } from "@/lib/date";

export default function GoalCard({ goal }: { goal: GoalWithStats }) {
  const progress =
    goal.taskTotal > 0
      ? Math.round((goal.taskDone / goal.taskTotal) * 100)
      : goal.manualProgress;

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="block border border-hairline p-5 transition-colors hover:border-ink"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="truncate font-semibold text-ink">{goal.title}</h3>
        <span className="nums shrink-0 text-5xl font-bold text-accent">
          {progress}
          <span className="text-xl font-medium">%</span>
        </span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-ink-2">
        <span>
          {goal.taskTotal > 0
            ? `任务 ${goal.taskDone}/${goal.taskTotal}`
            : "手动进度"}
        </span>
        {goal.deadline ? (
          <span>截止 {formatDisplayDate(goal.deadline)}</span>
        ) : null}
      </div>
    </Link>
  );
}
