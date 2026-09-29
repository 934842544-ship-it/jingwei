/**
 * 近 30 天任务完成趋势 — 纯 SVG，不引入图表库。
 * 柱子按天排列，最高值决定高度比例。
 */
export default function TrendChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  if (data.length === 0) return null;

  const max = Math.max(1, ...data.map((d) => d.count));
  const width = 720;
  const height = 160;
  const barGap = 2;
  const barWidth = (width - barGap * (data.length - 1)) / data.length;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full min-w-[500px]"
        preserveAspectRatio="none"
      >
        {/* 基线 */}
        <line
          x1={0}
          y1={height - 0.5}
          x2={width}
          y2={height - 0.5}
          stroke="currentColor"
          className="text-hairline"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const barHeight = Math.round((d.count / max) * (height - 16));
          const x = i * (barWidth + barGap);
          const y = height - barHeight;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill="currentColor"
              className="text-accent"
            >
              <title>{`${d.date} · ${d.count} 个完成`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-ink-2">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data.at(-1)?.date.slice(5)}</span>
      </div>
    </div>
  );
}
