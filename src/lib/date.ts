/**
 * Asia/Shanghai 时区日期工具。
 * 习惯记录以 "YYYY-MM-DD" 字符串存储，规避 DateTime 的时区偏移问题。
 * 所有"今天"判断统一使用 Asia/Shanghai 时区。
 */

const TIME_ZONE = "Asia/Shanghai";

export function getShanghaiToday(): Date {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return new Date(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")),
    Number(get("minute")),
    Number(get("second")),
  );
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toShanghaiDateString(date: Date): string {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date);
}

/** 解析 "YYYY-MM-DD" 为本地零点 Date；无效输入返回 null */
export function parseDateString(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 周一为一周开始 */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = (d.getDay() + 6) % 7; // 周一=0 ... 周日=6
  d.setDate(d.getDate() - day);
  return d;
}

/** <input type="date"> 的 value */
export function toDateInputValue(date: Date): string {
  return toDateString(date);
}

/** 表单里的日期字符串 → Date；空或无效返回 null */
export function dateInputToDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value === "") return null;
  return parseDateString(value);
}

/** 展示用：2026.09.28（Swiss 数字风格） */
export function formatDisplayDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

/** 展示用：09.28 */
export function formatShortDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${m}.${d}`;
}

/** 截止日相对今天的标签：逾期 / 今天 / 明天 / MM.DD */
export function dueLabel(due: Date, today: Date): string {
  const diff = Math.round(
    (startOfDay(due).getTime() - startOfDay(today).getTime()) / 86400000,
  );
  if (diff < 0) return `逾期 ${Math.abs(diff)} 天`;
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  return formatShortDate(due);
}
