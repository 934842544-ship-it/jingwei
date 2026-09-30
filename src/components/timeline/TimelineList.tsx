import type { EventWithEntityName } from "@/lib/queries";

const ACTION_LABELS: Record<string, string> = {
  create: "创建",
  update: "更新",
  delete: "删除",
  toggle_done: "完成切换",
  set_waiting: "设为等待",
  set_progress: "设置进度",
  toggle_record: "打卡",
  add_checklist_item: "添加子项",
  toggle_checklist_item: "子项切换",
  remove_checklist_item: "删除子项",
};

const ENTITY_ICONS: Record<string, string> = {
  task: "✓",
  goal: "◎",
  habit: "🔥",
};

export default function TimelineList({
  events,
}: {
  events: EventWithEntityName[];
}) {
  return (
    <div className="border border-hairline">
      {events.map((event, idx) => {
        const icon = ENTITY_ICONS[event.entityType] ?? "•";
        const actionLabel = ACTION_LABELS[event.action] ?? event.action;
        const summary = buildSummary(event);
        const date = new Date(event.createdAt);
        const timeStr = formatTime(date);
        const dateStr = formatDate(date);

        const showDateHeader =
          idx === 0 ||
          formatDate(new Date(events[idx - 1].createdAt)) !== dateStr;

        return (
          <div key={event.id}>
            {showDateHeader ? (
              <div className="border-b border-hairline bg-ink-5 px-4 py-2 text-xs font-semibold text-ink-2">
                {dateStr}
              </div>
            ) : null}
            <div className="flex gap-4 border-b border-hairline px-4 py-3 last:border-b-0">
              <div className="flex w-8 shrink-0 justify-center text-lg text-ink-2">
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold text-ink">
                    {event.entityName}
                  </span>
                  <span className="text-xs text-ink-2">
                    {event.entityType}
                  </span>
                  <span className="text-xs text-accent">{actionLabel}</span>
                </div>
                {summary ? (
                  <p className="mt-1 text-sm text-ink-2">{summary}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-xs text-ink-2">{timeStr}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildSummary(event: EventWithEntityName): string | null {
  const before = event.before ?? {};
  const after = event.after ?? {};

  const parts: string[] = [];

  const fields: Record<string, string> = {
    status: "状态",
    priority: "优先级",
    progressMode: "进度模式",
    manualProgress: "进度",
    plannedDate: "计划日期",
    dueDate: "截止日期",
    waitingOn: "等待",
    followUpDate: "跟进日期",
    estimatedMinutes: "预计时长",
    title: "标题",
    name: "名称",
    targetPerWeek: "每周目标",
    parentId: "父目标",
  };

  for (const key of Object.keys(fields)) {
    const beforeVal = before[key];
    const afterVal = after[key];
    const label = fields[key];

    if (beforeVal === undefined && afterVal === undefined) continue;
    if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) continue;

    const beforeStr = formatValue(beforeVal, key);
    const afterStr = formatValue(afterVal, key);

    if (beforeVal === undefined || beforeVal === null) {
      parts.push(`${label}: → ${afterStr}`);
    } else if (afterVal === undefined || afterVal === null) {
      parts.push(`${label}: ${beforeStr} → (清除)`);
    } else {
      parts.push(`${label}: ${beforeStr} → ${afterStr}`);
    }
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatValue(val: unknown, key: string): string {
  if (val === undefined || val === null) return "—";
  if (key === "estimatedMinutes") return `${val} 分钟`;
  if (key.endsWith("Date") && typeof val === "string") {
    return val.slice(0, 10);
  }
  if (typeof val === "boolean") return val ? "是" : "否";
  return String(val);
}

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
