/**
 * 超大数字块 — Swiss "数字即构图" 记忆点。
 * 每个视图以一个超大号数字开场，配小号说明标签。
 */
export default function BigNumber({
  value,
  suffix,
  label,
  accent = false,
  size = "lg",
}: {
  value: string | number;
  suffix?: string;
  label: string;
  accent?: boolean;
  size?: "lg" | "md";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs tracking-widest text-ink-2">{label}</span>
      <span
        className={`nums leading-none font-bold ${
          size === "lg"
            ? "text-[clamp(4rem,10vw,7.5rem)]"
            : "text-[clamp(2.5rem,6vw,4rem)]"
        } ${accent ? "text-accent" : "text-ink"}`}
      >
        {value}
        {suffix ? (
          <span className="text-3xl font-medium tracking-normal">{suffix}</span>
        ) : null}
      </span>
    </div>
  );
}
