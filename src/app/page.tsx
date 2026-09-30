import Link from "next/link";
import { getDashboard } from "@/lib/queries";
import BigNumber from "@/components/ui/BigNumber";
import TaskItem from "@/components/tasks/TaskItem";
import HabitRow from "@/components/habits/HabitRow";
import EmptyState from "@/components/ui/EmptyState";
import DailyFocus from "@/components/daily/DailyFocus";
import { formatDisplayDate, toDateString, startOfDay } from "@/lib/date";
import { requireUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const data = await getDashboard(user.id);
  const today = data.today;
  const dueToday = data.dueToday;
  const overdue = data.overdue;
  const waiting = data.waiting;
  const completedToday = data.completedToday;

  const todayStr = toDateString(startOfDay(today));

  const todayDoneCount = completedToday.length;
  const todayTotal = overdue.length + dueToday.length + waiting.length + completedToday.length;

  return (
    <div className="space-y-14">
      {/* 头部：超大数字 + 日期 */}
      <header className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <BigNumber
            value={todayDoneCount}
            suffix={todayTotal > 0 ? ` / ${todayTotal}` : ""}
            label={`今日 · ${formatDisplayDate(today)}`}
            accent
          />
          <p className="mt-3 text-sm text-ink-2">
            {overdue.length > 0
              ? `${overdue.length} 项已逾期`
              : waiting.length > 0
                ? `${waiting.length} 项等待中`
                : "没有逾期任务"}
          </p>
        </div>
        <div className="md:col-span-4 md:text-right">
          <Link
            href="/tasks"
            className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            查看全部任务 →
          </Link>
        </div>
      </header>

      {/* 今日焦点 */}
      <section>
        <DailyFocus daily={data.daily} date={todayStr} />
      </section>

      {/* 逾期任务 */}
      {overdue.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-accent">
            已逾期
          </h2>
          <div className="border border-hairline px-4 py-1">
            {overdue.map((t) => (
              <TaskItem key={t.id} task={t} today={today} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 今日到期 */}
      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
          今日到期
        </h2>
        {dueToday.length > 0 ? (
          <div className="border border-hairline px-4 py-1">
            {dueToday.map((t) => (
              <TaskItem key={t.id} task={t} today={today} />
            ))}
          </div>
        ) : (
          <EmptyState title="今天没有到期任务" hint="去任务列表加一个，或把已有任务设为今日截止。" />
        )}
      </section>

      {/* 等待中 */}
      {waiting.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-amber-600">
            等待中
          </h2>
          <div className="border border-hairline px-4 py-1">
            {waiting.map((t) => (
              <TaskItem key={t.id} task={t} today={today} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 今日已完成 */}
      {completedToday.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
            今日已完成
          </h2>
          <div className="border border-hairline px-4 py-1">
            {completedToday.map((t) => (
              <TaskItem key={t.id} task={t} today={today} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 习惯打卡 */}
      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
          今日习惯
        </h2>
        {data.habits.length > 0 ? (
          <div className="border border-hairline px-4">
            {data.habits.map((h) => (
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
            hint="建立每日或每周的习惯，用打卡记录累积。"
          />
        )}
        <div className="mt-3">
          <Link
            href="/habits"
            className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            管理习惯 →
          </Link>
        </div>
      </section>

      {/* 活跃目标 */}
      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
          活跃目标
        </h2>
        {data.goals.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.goals.map((g) => (
              <Link
                key={g.id}
                href={`/goals/${g.id}`}
                className="block border border-hairline p-4 hover:border-ink"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold text-ink">{g.title}</span>
                  <span className="nums text-3xl font-bold text-accent">
                    {g.displayProgress}
                    <span className="text-sm font-medium">%</span>
                  </span>
                </div>
                <p className="mt-2 text-xs text-ink-2">
                  {g.progressMode === "AUTO"
                    ? `自动 · 任务 ${g.taskDone}/${g.taskTotal}${g.childTotal > 0 ? ` · 子目标 ${g.childDone}/${g.childTotal}` : ""}`
                    : "手动进度"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="还没有目标"
            hint="设定一个目标，再用任务把它拆解成可执行的步骤。"
          />
        )}
        <div className="mt-3">
          <Link
            href="/goals"
            className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            管理目标 →
          </Link>
        </div>
      </section>
    </div>
  );
}
