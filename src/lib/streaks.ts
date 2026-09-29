import { toDateString, startOfWeek, addDays } from "./date";

/**
 * 习惯打卡统计：基于 "YYYY-MM-DD" 日期集合。
 */

export interface Streaks {
  /** 截至今天（或昨天）的连续打卡天数 */
  current: number;
  /** 历史最长连续天数 */
  longest: number;
}

/** 当前连续：从今天往前数；若今天未打，从昨天往前数 */
export function computeStreaks(dates: Set<string>, today: Date): Streaks {
  const todayStr = toDateString(today);
  const yesterdayStr = toDateString(addDays(today, -1));
  const anchor = dates.has(todayStr) ? todayStr : dates.has(yesterdayStr) ? yesterdayStr : null;

  let current = 0;
  if (anchor) {
    let cursor = new Date(anchor + "T00:00:00");
    while (dates.has(toDateString(cursor))) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
  }

  const sorted = [...dates].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const ds of sorted) {
    const d = new Date(ds + "T00:00:00");
    if (prev && toDateString(addDays(prev, 1)) === ds) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest: Math.max(longest, current) };
}

/** 本周（周一起）打卡天数 */
export function countThisWeek(dates: Set<string>, today: Date): number {
  const weekStart = startOfWeek(today);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (dates.has(toDateString(addDays(weekStart, i)))) count += 1;
  }
  return count;
}
