import Link from "next/link";
import { getStats } from "@/lib/queries";
import BigNumber from "@/components/ui/BigNumber";
import TrendChart from "@/components/stats/TrendChart";
import LandingRateChart from "@/components/stats/LandingRateChart";
import { requireUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const range = sp.range === "month" ? "month" : "week";
  const stats = await getStats(user.id);

  const period = range === "week" ? stats.week : stats.month;
  const rate = period.total > 0 ? Math.round((period.done / period.total) * 100) : 0;

  return (
    <div className="space-y-10">
      <header className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <BigNumber value={rate} suffix="%" label={`${range === "week" ? "本周" : "本月"}完成率`} accent />
          <p className="mt-3 text-sm text-ink-2">
            {period.done} / {period.total} 个任务
          </p>
        </div>
        <div className="md:col-span-4 md:text-right">
          <div className="inline-flex gap-2 text-sm">
            <Link
              href="/stats"
              className={`border-b-2 pb-1 ${
                range === "week"
                  ? "border-accent font-semibold text-accent"
                  : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              本周
            </Link>
            <Link
              href="/stats?range=month"
              className={`border-b-2 pb-1 ${
                range === "month"
                  ? "border-accent font-semibold text-accent"
                  : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              本月
            </Link>
          </div>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
          计划 vs 实际（近 7 天落地率）
        </h2>
        <div className="border border-hairline p-5">
          <div className="mb-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="nums text-3xl font-bold text-ink">
                {stats.landingRate.week.planned}
              </div>
              <div className="mt-1 text-xs text-ink-2">本周计划</div>
            </div>
            <div>
              <div className="nums text-3xl font-bold text-ink">
                {stats.landingRate.week.done}
              </div>
              <div className="mt-1 text-xs text-ink-2">本周完成</div>
            </div>
            <div>
              <div
                className={`nums text-3xl font-bold ${
                  stats.landingRate.week.rate < 50 ? "text-accent" : "text-accent"
                }`}
              >
                {stats.landingRate.week.rate}%
              </div>
              <div className="mt-1 text-xs text-ink-2">落地率</div>
            </div>
          </div>
          <LandingRateChart data={stats.landingRate.last7} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
          近 30 天每日完成
        </h2>
        <div className="border border-hairline p-5">
          <TrendChart data={stats.trend} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
          习惯本周达标
        </h2>
        {stats.habits.length > 0 ? (
          <div className="border border-hairline">
            {stats.habits.map((h) => {
              const met = h.thisWeek >= h.targetPerWeek;
              return (
                <div
                  key={h.id}
                  className="flex items-baseline justify-between border-b border-hairline px-4 py-3 last:border-b-0"
                >
                  <span className="text-sm text-ink">{h.name}</span>
                  <span className="nums text-xl font-bold">
                    <span className={met ? "text-accent" : "text-ink"}>
                      {h.thisWeek}
                    </span>
                    <span className="text-sm font-normal text-ink-2">
                      {" "}
                      / {h.targetPerWeek} 天
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-ink-2">还没有习惯。</p>
        )}
      </section>
    </div>
  );
}
