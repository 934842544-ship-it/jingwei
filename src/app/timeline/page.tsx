import { getEventTimeline } from "@/lib/queries";
import { requireUser } from "@/lib/auth/user";
import BigNumber from "@/components/ui/BigNumber";
import EmptyState from "@/components/ui/EmptyState";
import TimelineList from "@/components/timeline/TimelineList";

export const dynamic = "force-dynamic";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter =
    sp.filter === "task" || sp.filter === "goal" || sp.filter === "habit"
      ? sp.filter
      : "all";

  const events = await getEventTimeline(user.id, filter, 50);

  const filterLabels: Record<string, string> = {
    all: "全部",
    task: "任务",
    goal: "目标",
    habit: "习惯",
  };

  return (
    <div className="space-y-10">
      <header className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <BigNumber value={events.length} label="近期事件" accent />
          <p className="mt-3 text-sm text-ink-2">
            最近 50 条操作记录，倒序展示
          </p>
        </div>
      </header>

      <section>
        <div className="mb-4 flex gap-4 text-sm">
          {(["all", "task", "goal", "habit"] as const).map((f) => (
            <a
              key={f}
              href={`/timeline${f === "all" ? "" : `?filter=${f}`}`}
              className={`border-b-2 pb-1 ${
                filter === f
                  ? "border-accent font-semibold text-accent"
                  : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {filterLabels[f]}
            </a>
          ))}
        </div>

        {events.length > 0 ? (
          <TimelineList events={events} />
        ) : (
          <EmptyState title="暂无事件" hint="还没有任何操作记录。" />
        )}
      </section>
    </div>
  );
}
