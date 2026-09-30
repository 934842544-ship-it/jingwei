import type { LandingRateDay } from "@/lib/queries";

export default function LandingRateChart({
  data,
}: {
  data: LandingRateDay[];
}) {
  if (data.length === 0) return null;

  const width = 720;
  const height = 200;
  const barGap = 8;
  const groupWidth = (width - barGap * (data.length - 1)) / data.length;
  const barWidth = groupWidth / 2 - 4;

  const maxCount = Math.max(
    1,
    ...data.map((d) => Math.max(d.planned, d.done)),
  );

  function barHeight(val: number) {
    return Math.round((val / maxCount) * (height - 50));
  }

  const ratePoints = data.map((d, i) => {
    const x = i * (groupWidth + barGap) + groupWidth / 2;
    const y = height - 40 - (d.rate / 100) * (height - 60);
    return { x, y, rate: d.rate };
  });

  const linePath = ratePoints
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-52 w-full min-w-[500px]"
        preserveAspectRatio="none"
      >
        <line
          x1={0}
          y1={height - 40.5}
          x2={width}
          y2={height - 40.5}
          stroke="currentColor"
          className="text-hairline"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const groupX = i * (groupWidth + barGap);
          const plannedH = barHeight(d.planned);
          const doneH = barHeight(d.done);
          const lowRate = d.rate < 50;

          return (
            <g key={d.date}>
              <rect
                x={groupX}
                y={height - 40 - plannedH}
                width={barWidth}
                height={plannedH}
                fill="currentColor"
                className="text-ink-2"
              >
                <title>{`${d.date} 计划 ${d.planned} 个`}</title>
              </rect>
              <rect
                x={groupX + barWidth + 8}
                y={height - 40 - doneH}
                width={barWidth}
                height={doneH}
                fill="currentColor"
                className={lowRate ? "text-accent" : "text-accent/70"}
              >
                <title>{`${d.date} 完成 ${d.done} 个，落地率 ${d.rate}%`}</title>
              </rect>
              <text
                x={groupX + groupWidth / 2}
                y={height - 24}
                textAnchor="middle"
                className="fill-ink-2"
                fontSize={10}
              >
                {d.date.slice(5)}
              </text>
            </g>
          );
        })}
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          className="text-accent"
          strokeWidth={2}
        />
        {ratePoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="currentColor"
            className="text-accent"
          />
        ))}
      </svg>
      <div className="mt-2 flex gap-6 text-xs text-ink-2">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 bg-ink-2" /> 计划
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 bg-accent/70" /> 实际完成
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-4 bg-accent" /> 落地率
        </span>
      </div>
    </div>
  );
}
