import { getRecentDailies } from "@/lib/queries";
import { getDaily } from "@/lib/services";
import { requireUser } from "@/lib/auth/user";
import BigNumber from "@/components/ui/BigNumber";
import ReflectionForm from "@/components/daily/ReflectionForm";
import ReflectionList from "@/components/daily/ReflectionList";
import { toDateString, getShanghaiToday } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function ReflectionPage() {
  const user = await requireUser();
  const today = getShanghaiToday();
  const todayStr = toDateString(today);

  const [todayDaily, dailies] = await Promise.all([
    getDaily(user.id, todayStr),
    getRecentDailies(user.id, 14),
  ]);

  const hasReflectionToday =
    todayDaily && (todayDaily.win || todayDaily.improve || todayDaily.nextStep);

  const writtenCount = dailies.filter(
    (d) => d.win || d.improve || d.nextStep,
  ).length;

  return (
    <div className="space-y-10">
      <header className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <BigNumber value={writtenCount} label="近 14 天复盘天数" accent />
          <p className="mt-3 text-sm text-ink-2">
            {hasReflectionToday ? "今日已写复盘 ✓" : "今日还没写复盘"}
          </p>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
          今日复盘
        </h2>
        <div className="border border-hairline p-5">
          <ReflectionForm
            date={todayStr}
            defaultValues={{
              win: todayDaily?.win ?? "",
              improve: todayDaily?.improve ?? "",
              nextStep: todayDaily?.nextStep ?? "",
            }}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-ink-2">
          历史复盘
        </h2>
        <ReflectionList dailies={dailies} todayStr={todayStr} />
      </section>
    </div>
  );
}
