import { getGoals } from "@/lib/queries";
import GoalCard from "@/components/goals/GoalCard";
import GoalForm from "@/components/goals/GoalForm";
import BigNumber from "@/components/ui/BigNumber";
import EmptyState from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = await getGoals();
  const active = goals.filter((g) => g.status === "ACTIVE");
  const done = goals.filter((g) => g.status === "DONE");
  const archived = goals.filter((g) => g.status === "ARCHIVED");

  return (
    <div className="space-y-10">
      <header className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <BigNumber value={active.length} label="活跃目标" accent />
          <p className="mt-3 text-sm text-ink-2">
            总计 {goals.length} 个 · 已完成 {done.length} 个
          </p>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8">
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
            进行中
          </h2>
          {active.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {active.map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="还没有目标"
              hint="创建第一个目标，再用任务把它拆解。"
            />
          )}
        </div>
        <div className="md:col-span-4">
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
            新建目标
          </h2>
          <div className="border border-hairline p-4">
            <GoalForm />
          </div>
        </div>
      </section>

      {done.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
            已完成
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {done.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </div>
        </section>
      ) : null}

      {archived.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
            已归档
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {archived.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
