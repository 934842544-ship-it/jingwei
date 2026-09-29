import { createHabit } from "@/app/actions/habits";
import { getHabits } from "@/lib/queries";
import HabitRow from "@/components/habits/HabitRow";
import BigNumber from "@/components/ui/BigNumber";
import EmptyState from "@/components/ui/EmptyState";
import { computeStreaks } from "@/lib/streaks";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const habits = await getHabits();
  const today = new Date();

  const totalStreaks = habits.reduce((sum, h) => {
    const s = computeStreaks(new Set(h.records), today);
    return sum + s.current;
  }, 0);

  return (
    <div className="space-y-10">
      <header className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <BigNumber
            value={habits.length}
            label="进行中的习惯"
            accent
          />
          <p className="mt-3 text-sm text-ink-2">
            当前累计连续 {totalStreaks} 天
          </p>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8">
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
            习惯列表
          </h2>
          {habits.length > 0 ? (
            <div className="border border-hairline px-4">
              {habits.map((h) => (
                <HabitRow
                  key={h.id}
                  id={h.id}
                  name={h.name}
                  targetPerWeek={h.targetPerWeek}
                  records={h.records}
                  today={today}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="还没有习惯"
              hint="建立一个每日或每周的习惯，用打卡记录每一次坚持。"
            />
          )}
        </div>
        <div className="md:col-span-4">
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
            新建习惯
          </h2>
          <div className="border border-hairline p-4">
            <form action={createHabit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-2">
                  名称
                  <input
                    name="name"
                    required
                    className="mt-1 w-full border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                    placeholder="如：阅读 30 分钟"
                  />
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-2">
                  每周目标天数
                  <select
                    name="targetPerWeek"
                    defaultValue={7}
                    className="mt-1 w-full border border-hairline bg-paper px-2 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n} 天/周
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="submit"
                className="bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                创建习惯
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
