import Link from "next/link";
import { getTasks, getActiveGoals } from "@/lib/queries";
import TaskItem from "@/components/tasks/TaskItem";
import TaskForm from "@/components/tasks/TaskForm";
import BigNumber from "@/components/ui/BigNumber";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    goalId?: string;
    today?: string;
  }>;
}) {
  const sp = await searchParams;
  const status =
    sp.status === "all" || sp.status === "open" || sp.status === "done"
      ? sp.status
      : "all";
  const priority =
    sp.priority === "all" ||
    sp.priority === "HIGH" ||
    sp.priority === "NORMAL" ||
    sp.priority === "LOW"
      ? sp.priority
      : "all";
  const goalId = sp.goalId ?? "all";
  const today = sp.today === "1";

  const [tasks, goals] = await Promise.all([
    getTasks({
      status: status as "all" | "open" | "done",
      priority:
        priority === "all"
          ? "all"
          : (priority as "HIGH" | "NORMAL" | "LOW"),
      goalId,
      today,
    }),
    getActiveGoals(),
  ]);

  const now = new Date();
  const doneCount = tasks.filter((t) => t.done).length;
  const openCount = tasks.length - doneCount;

  function filterUrl(patch: Record<string, string>) {
    const params = new URLSearchParams({
      status,
      priority,
      goalId,
      ...(today ? { today: "1" } : {}),
      ...patch,
    });
    if (params.get("status") === "all") params.delete("status");
    if (params.get("priority") === "all") params.delete("priority");
    if (params.get("goalId") === "all") params.delete("goalId");
    const qs = params.toString();
    return qs ? `/tasks?${qs}` : "/tasks";
  }

  return (
    <div className="space-y-10">
      <header className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <BigNumber value={openCount} suffix={tasks.length > 0 ? ` / ${tasks.length}` : ""} label="待办任务" accent />
          <p className="mt-3 text-sm text-ink-2">
            已完成 {doneCount} 项
          </p>
        </div>
      </header>

      {/* 筛选器 */}
      <section className="flex flex-wrap gap-x-6 gap-y-2 border-y border-hairline py-3 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-ink-2">状态</span>
          {[
            { v: "all", l: "全部" },
            { v: "open", l: "未完成" },
            { v: "done", l: "已完成" },
          ].map((o) => (
            <Link
              key={o.v}
              href={filterUrl({ status: o.v })}
              className={`border-b-2 pb-1 ${
                status === o.v
                  ? "border-accent font-semibold text-accent"
                  : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {o.l}
            </Link>
          ))}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-ink-2">优先级</span>
          {[
            { v: "all", l: "全部" },
            { v: "HIGH", l: "高" },
            { v: "NORMAL", l: "中" },
            { v: "LOW", l: "低" },
          ].map((o) => (
            <Link
              key={o.v}
              href={filterUrl({ priority: o.v })}
              className={`border-b-2 pb-1 ${
                priority === o.v
                  ? "border-accent font-semibold text-accent"
                  : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {o.l}
            </Link>
          ))}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-ink-2">目标</span>
          <Link
            href={filterUrl({ goalId: "all" })}
            className={`border-b-2 pb-1 ${
              goalId === "all"
                ? "border-accent font-semibold text-accent"
                : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            全部
          </Link>
          {goals.map((g) => (
            <Link
              key={g.id}
              href={filterUrl({ goalId: g.id })}
              className={`truncate border-b-2 pb-1 max-w-[10rem] ${
                goalId === g.id
                  ? "border-accent font-semibold text-accent"
                  : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {g.title}
            </Link>
          ))}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-ink-2">时间</span>
          <Link
            href={filterUrl({ today: today ? "" : "1" })}
            className={`border-b-2 pb-1 ${
              today
                ? "border-accent font-semibold text-accent"
                : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            仅限今日
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8">
          {tasks.length > 0 ? (
            <div className="border border-hairline px-4 py-1">
              {tasks.map((t) => (
                <TaskItem key={t.id} task={t} today={now} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-ink-2">没有任务</p>
          )}
        </div>
        <div className="md:col-span-4">
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
            新建任务
          </h2>
          <div className="border border-hairline p-4">
            <TaskForm goals={goals} />
          </div>
        </div>
      </section>
    </div>
  );
}
