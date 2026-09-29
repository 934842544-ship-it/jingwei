import { toDateString, addDays, startOfWeek, formatShortDate } from "@/lib/date";

/**
 * 近 13 周习惯打卡热力图（CSS Grid 实现，无图表库）
 * 列 = 周，行 = 周几（周一到周日）
 */
export default function Heatmap({
  dates,
  today,
  weeks = 13,
}: {
  dates: Set<string>;
  today: Date;
  weeks?: number;
}) {
  const weekStart = startOfWeek(today);
  const endOfLastFullWeek = addDays(weekStart, -1);
  const startDate = addDays(endOfLastFullWeek, -(weeks * 7) + 1);

  const cells: { date: string; inMonth?: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(startDate, i);
    cells.push({
      date: toDateString(d),
      isToday: false,
    });
  }
  // 标记今日
  const todayStr = toDateString(today);
  const todayIdx = cells.findIndex((c) => c.date === todayStr);
  if (todayIdx >= 0) cells[todayIdx].isToday = true;

  // 周日到周六列头
  const weekLabels = ["一", "二", "三", "四", "五", "六", "日"];
  const monthLabels: string[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const d = addDays(startDate, w * 7);
    const m = d.getMonth();
    if (m !== lastMonth) {
      monthLabels[w] = `${d.getMonth() + 1}月`;
      lastMonth = m;
    } else {
      monthLabels[w] = "";
    }
  }

  return (
    <div className="flex gap-2">
      {/* 周几标签 */}
      <div className="grid grid-rows-7 gap-[2px] text-[10px] leading-none text-ink-2">
        {weekLabels.map((d, i) => (
          <span key={i} className="flex h-3 items-center">
            {d}
          </span>
        ))}
      </div>
      <div className="overflow-hidden">
        {/* 月份标签 */}
        <div className="mb-1 grid gap-[2px] text-[10px] text-ink-2"
             style={{ gridTemplateColumns: `repeat(${weeks}, 12px)` }}>
          {monthLabels.map((m, i) => (
            <span key={i} className="truncate">{m}</span>
          ))}
        </div>
        {/* 格子：按列（周）排布，每列 7 行 */}
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `repeat(${weeks}, 12px)`,
            gridAutoFlow: "column",
            gridTemplateRows: "repeat(7, 12px)",
          }}
        >
          {cells.map((cell, i) => {
            const active = dates.has(cell.date);
            return (
              <div
                key={i}
                title={`${cell.date}${active ? " · 已打卡" : ""}`}
                className={`h-3 w-3 border ${
                  active
                    ? "border-accent bg-accent"
                    : "border-hairline bg-surface"
                } ${cell.isToday ? "ring-1 ring-accent ring-offset-0" : ""}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
