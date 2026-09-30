import { getGoals } from "@/lib/queries";
import GoalCard from "@/components/goals/GoalCard";
import GoalForm from "@/components/goals/GoalForm";
import BigNumber from "@/components/ui/BigNumber";
import EmptyState from "@/components/ui/EmptyState";
import { requireUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await getGoals(user.id);
  const active = goals.filter((g) => g.status === "ACTIVE");
  const done = goals.filter((g) => g.status === "DONE");
  const archived = goals.filter((g) => g.status === "ARCHIVED");

  const topLevelActive = active.filter((g) => !g.parentId);
  const topLevelDone = done.filter((g) => !g.parentId);
  const topLevelArchived = archived.filter((g) => !g.parentId);

  function getChildren(parentId: string) {
    return goals.filter((g) => g.parentId === parentId);
  }

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
          {topLevelActive.length > 0 ? (
            <div className="space-y-3">
              {topLevelActive.map((g) => (
                <GoalCard key={g.id} goal={g} childrenGoals={getChildren(g.id).filter(c => c.status === "ACTIVE")} />
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
            <GoalForm goals={active} />
          </div>
        </div>
      </section>

      {topLevelDone.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
            已完成
          </h2>
          <div className="space-y-3">
            {topLevelDone.map((g) => (
              <GoalCard key={g.id} goal={g} childrenGoals={getChildren(g.id).filter(c => c.status === "DONE")} />
            ))}
          </div>
        </section>
      ) : null}

      {topLevelArchived.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
            已归档
          </h2>
          <div className="space-y-3">
            {topLevelArchived.map((g) => (
              <GoalCard key={g.id} goal={g} childrenGoals={getChildren(g.id).filter(c => c.status === "ARCHIVED")} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
