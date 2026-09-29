import Link from "next/link";
import { notFound } from "next/navigation";
import { getGoal, getGoalTasks } from "@/lib/queries";
import BigNumber from "@/components/ui/BigNumber";
import ManualProgress from "@/components/goals/ManualProgress";
import TaskForm from "@/components/tasks/TaskForm";
import TaskItem from "@/components/tasks/TaskItem";
import { formatDisplayDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const goal = await getGoal(id);
  if (!goal) notFound();

  const tasks = await getGoalTasks(id);

  const progress =
    goal.taskTotal > 0
      ? Math.round((goal.taskDone / goal.taskTotal) * 100)
      : goal.manualProgress;

  const today = new Date();

  return (
    <div className="space-y-10">
      <header className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <BigNumber value={progress} suffix="%" label={goal.title} accent />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
            <span>
              {goal.taskTotal > 0
                ? `任务 ${goal.taskDone}/${goal.taskTotal}`
                : "手动进度"}
            </span>
            {goal.deadline ? (
              <span>截止 {formatDisplayDate(goal.deadline)}</span>
            ) : null}
            <span className="capitalize">{goal.status.toLowerCase()}</span>
          </div>
          {goal.description ? (
            <p className="mt-3 max-w-xl text-sm text-ink-2">
              {goal.description}
            </p>
          ) : null}
        </div>
        <div className="md:col-span-4 md:text-right">
          <Link
            href="/goals"
            className="text-sm font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline"
          >
            ← 返回目标列表
          </Link>
        </div>
      </header>

      {goal.taskTotal === 0 ? (
        <section className="border border-hairline p-5">
          <ManualProgress goalId={goal.id} initial={goal.manualProgress} />
        </section>
      ) : null}

      <section className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8">
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
            关联任务
          </h2>
          {tasks.length > 0 ? (
            <div className="border border-hairline px-4 py-1">
              {tasks.map((t) => (
                <TaskItem key={t.id} task={t} today={today} showGoal={false} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-2">还没有关联任务。</p>
          )}
        </div>
        <div className="md:col-span-4">
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
            添加任务
          </h2>
          <div className="border border-hairline p-4">
            <TaskForm
              goals={[goal]}
              defaultGoalId={goal.id}
              submitLabel="添加到目标"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
