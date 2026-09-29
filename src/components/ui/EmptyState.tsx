/**
 * 空状态：真实文案，无占位假数据。
 */
export default function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="border border-hairline bg-surface px-6 py-10">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint ? <p className="mt-1 text-sm text-ink-2">{hint}</p> : null}
    </div>
  );
}
