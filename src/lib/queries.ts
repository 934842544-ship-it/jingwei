import { cache } from "react";
import { getDb } from "./db";
import { startOfDay, addDays, startOfWeek, toDateString, getShanghaiToday } from "./date";
import { computeStreaks, type Streaks } from "./streaks";
import type { DailyEntry, EventLogEntry, ChecklistItem } from "./services";
import { parseChecklist } from "./services";

export interface GoalWithStats {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  deadline: Date | null;
  status: "ACTIVE" | "DONE" | "ARCHIVED";
  progressMode: "AUTO" | "MANUAL";
  manualProgress: number;
  autoProgress: number;
  displayProgress: number;
  taskTotal: number;
  taskDone: number;
  childTotal: number;
  childDone: number;
}

export interface TaskWithGoal {
  id: string;
  title: string;
  notes: string | null;
  goalId: string | null;
  priority: "HIGH" | "NORMAL" | "LOW";
  dueDate: Date | null;
  plannedDate: Date | null;
  status: "OPEN" | "WAITING" | "DONE";
  waitingOn: string | null;
  followUpDate: Date | null;
  checklist: ChecklistItem[] | null;
  estimatedMinutes: number | null;
  done: boolean;
  doneAt: Date | null;
  createdAt: Date;
  goal: { id: string; title: string } | null;
}

export interface HabitWithRecords {
  id: string;
  name: string;
  targetPerWeek: number;
  archived: boolean;
  records: string[];
}

export interface HabitStreakInfo {
  id: string;
  name: string;
  targetPerWeek: number;
  thisWeek: number;
  currentStreak: number;
  longestStreak: number;
  warningDays: number;
}

export interface DashboardData {
  today: Date;
  daily: DailyEntry | null;
  overdue: TaskWithGoal[];
  dueToday: TaskWithGoal[];
  waiting: TaskWithGoal[];
  completedToday: TaskWithGoal[];
  habits: HabitWithRecords[];
  goals: GoalWithStats[];
  recentEvents: EventLogEntry[];
}

export interface TaskFilters {
  status: "all" | "open" | "waiting" | "done";
  priority: "all" | "HIGH" | "NORMAL" | "LOW";
  goalId: string | "all";
  today: boolean;
}

export interface LandingRateDay {
  date: string;
  planned: number;
  done: number;
  rate: number;
}

export interface StatsData {
  today: Date;
  week: { total: number; done: number };
  month: { total: number; done: number };
  trend: { date: string; count: number }[];
  landingRate: {
    week: { planned: number; done: number; rate: number };
    last7: LandingRateDay[];
  };
  habits: HabitStreakInfo[];
}

interface GoalRow {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  progressMode: string;
  manualProgress: number;
  taskTotal: number;
  taskDone: number;
}

interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  goalId: string | null;
  priority: string;
  dueDate: string | null;
  plannedDate: string | null;
  status: string;
  waitingOn: string | null;
  followUpDate: string | null;
  checklist: string | null;
  estimatedMinutes: number | null;
  done: number;
  doneAt: string | null;
  createdAt: string;
  goalTitle: string | null;
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computeAutoProgress(
  taskTotal: number,
  taskDone: number,
  childTotal: number,
  childDone: number,
): number {
  const hasTasks = taskTotal > 0;
  const hasChildren = childTotal > 0;
  if (!hasTasks && !hasChildren) return 0;
  const totalWeight = taskTotal + childTotal;
  const doneWeight = taskDone + childDone;
  return Math.round((doneWeight / totalWeight) * 100);
}

function toGoalStats(row: GoalRow, childStats: { childTotal: number; childDone: number }): GoalWithStats {
  const autoProgress = computeAutoProgress(row.taskTotal, row.taskDone, childStats.childTotal, childStats.childDone);
  const displayProgress = row.progressMode === "AUTO" ? autoProgress : row.manualProgress;
  return {
    id: row.id,
    parentId: row.parentId,
    title: row.title,
    description: row.description,
    deadline: parseDate(row.deadline),
    status: row.status as "ACTIVE" | "DONE" | "ARCHIVED",
    progressMode: (row.progressMode || "MANUAL") as "AUTO" | "MANUAL",
    manualProgress: row.manualProgress,
    autoProgress,
    displayProgress,
    taskTotal: row.taskTotal,
    taskDone: row.taskDone,
    childTotal: childStats.childTotal,
    childDone: childStats.childDone,
  };
}

export function toTaskWithGoal(row: TaskRow): TaskWithGoal {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    goalId: row.goalId,
    priority: row.priority as "HIGH" | "NORMAL" | "LOW",
    dueDate: parseDate(row.dueDate),
    plannedDate: parseDate(row.plannedDate),
    status: (row.status || "OPEN") as "OPEN" | "WAITING" | "DONE",
    waitingOn: row.waitingOn ?? null,
    followUpDate: parseDate(row.followUpDate),
    checklist: parseChecklist(row.checklist),
    estimatedMinutes: row.estimatedMinutes,
    done: row.done === 1,
    doneAt: parseDate(row.doneAt),
    createdAt: new Date(row.createdAt),
    goal: row.goalId && row.goalTitle
      ? { id: row.goalId, title: row.goalTitle }
      : null,
  };
}

function goalQueryWhere(statusFilter?: string, hasUserId = true) {
  const where: string[] = [];
  if (hasUserId) where.push("g.userId = @userId");
  if (statusFilter) where.push("g.status = @status");
  return where.length ? `WHERE ${where.join(" AND ")}` : "";
}

function buildChildStatsMap(db: ReturnType<typeof getDb>, userId: string): Map<string, { childTotal: number; childDone: number }> {
  const childRows = db
    .prepare(
      `SELECT parentId, COUNT(*) as childTotal,
              SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) as childDone
       FROM Goal
       WHERE userId = @userId AND parentId IS NOT NULL
       GROUP BY parentId`,
    )
    .all({ userId }) as { parentId: string; childTotal: number; childDone: number }[];

  const map = new Map<string, { childTotal: number; childDone: number }>();
  for (const r of childRows) {
    map.set(r.parentId, { childTotal: r.childTotal, childDone: r.childDone });
  }
  return map;
}

function getGoalsWithStats(userId: string, statusFilter?: string): GoalWithStats[] {
  const db = getDb();
  const where = goalQueryWhere(statusFilter, true);
  const stmt = db.prepare(
    `
    SELECT
      g.id, g.parentId, g.title, g.description, g.deadline, g.status, g.progressMode, g.manualProgress,
      COUNT(t.id) as taskTotal,
      SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) as taskDone
    FROM Goal g
    LEFT JOIN Task t ON t.goalId = g.id
    ${where}
    GROUP BY g.id
    ORDER BY
      CASE g.status WHEN 'ACTIVE' THEN 0 WHEN 'DONE' THEN 1 ELSE 2 END,
      g.deadline IS NULL, g.deadline ASC, g.createdAt DESC
  `,
  );
  const params: Record<string, string> = { userId };
  if (statusFilter) params.status = statusFilter;
  const rows = stmt.all(params) as GoalRow[];

  const childStatsMap = buildChildStatsMap(db, userId);

  return rows.map((row) => {
    const childStats = childStatsMap.get(row.id) ?? { childTotal: 0, childDone: 0 };
    return toGoalStats(row, childStats);
  });
}

export const getGoals = cache(async (userId: string): Promise<GoalWithStats[]> => {
  return getGoalsWithStats(userId);
});

export const getGoal = cache(async (userId: string, id: string): Promise<GoalWithStats | null> => {
  const db = getDb();
  const row = db
    .prepare(
      `
    SELECT
      g.id, g.parentId, g.title, g.description, g.deadline, g.status, g.progressMode, g.manualProgress,
      COUNT(t.id) as taskTotal,
      SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) as taskDone
    FROM Goal g
    LEFT JOIN Task t ON t.goalId = g.id
    WHERE g.id = @id AND g.userId = @userId
    GROUP BY g.id
  `,
    )
    .get({ id, userId }) as GoalRow | undefined;
  if (!row) return null;

  const childStatsMap = buildChildStatsMap(db, userId);
  const childStats = childStatsMap.get(id) ?? { childTotal: 0, childDone: 0 };
  return toGoalStats(row, childStats);
});

export const getGoalTasks = cache(
  async (userId: string, goalId: string): Promise<TaskWithGoal[]> => {
    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT t.*, g.title as goalTitle
      FROM Task t
      LEFT JOIN Goal g ON g.id = t.goalId
      WHERE t.goalId = @goalId AND t.userId = @userId
      ORDER BY
        t.done ASC,
        t.dueDate IS NULL, t.dueDate ASC,
        t.createdAt DESC
    `,
      )
      .all({ goalId, userId }) as TaskRow[];
    return rows.map(toTaskWithGoal);
  },
);

export const getTasks = cache(
  async (userId: string, filters: TaskFilters): Promise<TaskWithGoal[]> => {
    const today = getShanghaiToday();
    const dayStart = toDateString(startOfDay(today));
    const dayEnd = toDateString(addDays(startOfDay(today), 1));

    const where: string[] = ["t.userId = @userId"];
    const params: Record<string, string> = { userId };

    if (filters.status === "open") where.push("t.status = 'OPEN'");
    if (filters.status === "waiting") where.push("t.status = 'WAITING'");
    if (filters.status === "done") where.push("t.status = 'DONE'");
    if (filters.priority !== "all") {
      where.push("t.priority = @priority");
      params.priority = filters.priority;
    }
    if (filters.goalId !== "all") {
      where.push("t.goalId = @goalId");
      params.goalId = filters.goalId;
    }
    if (filters.today) {
      where.push("t.dueDate < @dayEnd");
      params.dayEnd = dayEnd;
      void dayStart;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT t.*, g.title as goalTitle
      FROM Task t
      LEFT JOIN Goal g ON g.id = t.goalId
      ${whereSql}
      ORDER BY
        CASE t.status WHEN 'OPEN' THEN 0 WHEN 'WAITING' THEN 1 ELSE 2 END,
        CASE t.priority WHEN 'HIGH' THEN 0 WHEN 'NORMAL' THEN 1 ELSE 2 END,
        t.dueDate IS NULL, t.dueDate ASC,
        t.createdAt DESC
    `,
      )
      .all(params) as TaskRow[];
    return rows.map(toTaskWithGoal);
  },
);

export const getTask = cache(async (userId: string, id: string): Promise<TaskWithGoal | null> => {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT t.*, g.title as goalTitle
      FROM Task t
      LEFT JOIN Goal g ON g.id = t.goalId
      WHERE t.id = @id AND t.userId = @userId
    `,
    )
    .get({ id, userId }) as TaskRow | undefined;
  return row ? toTaskWithGoal(row) : null;
});

const HEATMAP_DAYS = 91;

export const getHabits = cache(async (userId: string): Promise<HabitWithRecords[]> => {
  const db = getDb();
  const today = getShanghaiToday();
  const since = toDateString(
    addDays(startOfDay(today), -(HEATMAP_DAYS - 1)),
  );

  const habits = db
    .prepare(
      `SELECT id, name, targetPerWeek, archived FROM Habit
       WHERE archived = 0 AND userId = @userId ORDER BY createdAt ASC`,
    )
    .all({ userId }) as { id: string; name: string; targetPerWeek: number; archived: number }[];

  const habitIds = habits.map((h) => h.id);
  const records = habitIds.length > 0
    ? db
        .prepare(
          `SELECT hr.habitId, hr.date FROM HabitRecord hr
           INNER JOIN Habit h ON h.id = hr.habitId
           WHERE h.userId = @userId AND hr.date >= @since
           ORDER BY hr.date ASC`,
        )
        .all({ userId, since }) as { habitId: string; date: string }[]
    : [];

  const map = new Map<string, string[]>();
  for (const r of records) {
    const arr = map.get(r.habitId) ?? [];
    arr.push(r.date);
    map.set(r.habitId, arr);
  }

  return habits.map((h) => ({
    id: h.id,
    name: h.name,
    targetPerWeek: h.targetPerWeek,
    archived: h.archived === 1,
    records: map.get(h.id) ?? [],
  }));
});

export const getHabit = cache(async (userId: string, id: string): Promise<HabitWithRecords | null> => {
  const db = getDb();
  const today = getShanghaiToday();
  const since = toDateString(
    addDays(startOfDay(today), -(HEATMAP_DAYS - 1)),
  );

  const habit = db
    .prepare(
      `SELECT id, name, targetPerWeek, archived FROM Habit
       WHERE id = @id AND userId = @userId`,
    )
    .get({ id, userId }) as
    | { id: string; name: string; targetPerWeek: number; archived: number }
    | undefined;
  if (!habit) return null;

  const records = db
    .prepare(
      `SELECT date FROM HabitRecord
       WHERE habitId = @habitId AND date >= @since
       ORDER BY date ASC`,
    )
    .all({ habitId: id, since }) as { date: string }[];

  return {
    id: habit.id,
    name: habit.name,
    targetPerWeek: habit.targetPerWeek,
    archived: habit.archived === 1,
    records: records.map((r) => r.date),
  };
});

export const getActiveGoals = cache(async (userId: string): Promise<GoalWithStats[]> => {
  return getGoalsWithStats(userId, "ACTIVE");
});

function rowToDaily(row: {
  id: string;
  date: string;
  focus: string | null;
  win: string | null;
  improve: string | null;
  nextStep: string | null;
}): DailyEntry {
  return {
    id: row.id,
    date: row.date,
    focus: row.focus,
    win: row.win,
    improve: row.improve,
    nextStep: row.nextStep,
  };
}

function rowToEvent(row: {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  before: string | null;
  after: string | null;
  createdAt: string;
}): EventLogEntry {
  return {
    id: row.id,
    entityType: row.entityType as "task" | "goal" | "habit",
    entityId: row.entityId,
    action: row.action,
    before: row.before ? JSON.parse(row.before) : null,
    after: row.after ? JSON.parse(row.after) : null,
    createdAt: row.createdAt,
  };
}

export const getDashboard = cache(async (userId: string): Promise<DashboardData> => {
  const today = getShanghaiToday();
  const todayStr = toDateString(startOfDay(today));
  const dayStart = todayStr;
  const dayEnd = toDateString(addDays(startOfDay(today), 1));

  const db = getDb();

  const dailyRow = db
    .prepare("SELECT * FROM Daily WHERE userId = @userId AND date = @date")
    .get({ userId, date: todayStr }) as
    | {
        id: string;
        date: string;
        focus: string | null;
        win: string | null;
        improve: string | null;
        nextStep: string | null;
      }
    | undefined;
  const daily = dailyRow ? rowToDaily(dailyRow) : null;

  const overdueRows = db
    .prepare(
      `SELECT t.*, g.title as goalTitle FROM Task t
       LEFT JOIN Goal g ON g.id = t.goalId
       WHERE t.userId = @userId AND t.status = 'OPEN' AND t.dueDate < @dayStart
       ORDER BY t.dueDate ASC`,
    )
    .all({ userId, dayStart }) as TaskRow[];

  const dueTodayRows = db
    .prepare(
      `SELECT t.*, g.title as goalTitle FROM Task t
       LEFT JOIN Goal g ON g.id = t.goalId
       WHERE t.userId = @userId AND t.status = 'OPEN' AND t.dueDate >= @dayStart AND t.dueDate < @dayEnd
       ORDER BY
         CASE t.priority WHEN 'HIGH' THEN 0 WHEN 'NORMAL' THEN 1 ELSE 2 END,
         t.createdAt DESC`,
    )
    .all({ userId, dayStart, dayEnd }) as TaskRow[];

  const waitingRows = db
    .prepare(
      `SELECT t.*, g.title as goalTitle FROM Task t
       LEFT JOIN Goal g ON g.id = t.goalId
       WHERE t.userId = @userId AND t.status = 'WAITING'
       ORDER BY
         CASE WHEN t.followUpDate IS NOT NULL AND t.followUpDate <= @today THEN 0 ELSE 1 END,
         t.followUpDate IS NULL, t.followUpDate ASC,
         t.createdAt DESC`,
    )
    .all({ userId, today: todayStr }) as TaskRow[];

  const completedRows = db
    .prepare(
      `SELECT t.*, g.title as goalTitle FROM Task t
       LEFT JOIN Goal g ON g.id = t.goalId
       WHERE t.userId = @userId AND t.done = 1 AND t.doneAt >= @dayStart AND t.doneAt < @dayEnd
       ORDER BY t.doneAt DESC`,
    )
    .all({ userId, dayStart, dayEnd }) as TaskRow[];

  const eventRows = db
    .prepare(
      `SELECT * FROM EventLog WHERE userId = @userId
       ORDER BY createdAt DESC LIMIT 20`,
    )
    .all({ userId }) as {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    before: string | null;
    after: string | null;
    createdAt: string;
  }[];

  const [habits, goals] = await Promise.all([getHabits(userId), getActiveGoals(userId)]);

  return {
    today,
    daily,
    overdue: overdueRows.map(toTaskWithGoal),
    dueToday: dueTodayRows.map(toTaskWithGoal),
    waiting: waitingRows.map(toTaskWithGoal),
    completedToday: completedRows.map(toTaskWithGoal),
    habits,
    goals,
    recentEvents: eventRows.map(rowToEvent),
  };
});

function computeWarningDays(
  records: Set<string>,
  today: Date,
  targetPerWeek: number,
): number {
  const weekStart = startOfWeek(today);
  let thisWeekCount = 0;
  for (let i = 0; i < 7; i++) {
    if (records.has(toDateString(addDays(weekStart, i)))) thisWeekCount += 1;
  }
  const remaining = targetPerWeek - thisWeekCount;
  if (remaining <= 0) return 0;
  const todayStr = toDateString(today);
  const sundayOfWeek = toDateString(addDays(weekStart, 6));
  const isPastSunday = todayStr > sundayOfWeek;
  if (isPastSunday) return 0;

  let daysLeft = 0;
  let cursor = new Date(today);
  const weekEndStr = toDateString(addDays(weekStart, 6));
  while (toDateString(cursor) <= weekEndStr) {
    if (!records.has(toDateString(cursor))) daysLeft += 1;
    cursor = addDays(cursor, 1);
  }
  return Math.max(0, remaining - daysLeft);
}

export const getStats = cache(async (userId: string): Promise<StatsData> => {
  const today = getShanghaiToday();
  const weekStart = toDateString(startOfWeek(today));
  const monthStart = toDateString(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const since30 = toDateString(addDays(startOfDay(today), -29));

  const db = getDb();

  const weekRow = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as done
       FROM Task WHERE userId = @userId AND createdAt >= @weekStart`,
    )
    .get({ userId, weekStart }) as { total: number; done: number };

  const monthRow = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as done
       FROM Task WHERE userId = @userId AND createdAt >= @monthStart`,
    )
    .get({ userId, monthStart }) as { total: number; done: number };

  const doneRows = db
    .prepare(
      `SELECT doneAt FROM Task WHERE userId = @userId AND done = 1 AND doneAt >= @since30`,
    )
    .all({ userId, since30 }) as { doneAt: string }[];

  const counts = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    counts.set(toDateString(addDays(startOfDay(today), -29 + i)), 0);
  }
  for (const r of doneRows) {
    const key = r.doneAt ? r.doneAt.slice(0, 10) : "";
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const plannedRows = db
    .prepare(
      `SELECT plannedDate, doneAt FROM Task
       WHERE userId = @userId AND plannedDate >= @since30`,
    )
    .all({ userId, since30 }) as { plannedDate: string | null; doneAt: string | null }[];

  const plannedMap = new Map<string, { planned: number; done: number }>();
  for (let i = 0; i < 30; i++) {
    const d = toDateString(addDays(startOfDay(today), -29 + i));
    plannedMap.set(d, { planned: 0, done: 0 });
  }
  for (const r of plannedRows) {
    const pKey = r.plannedDate ? r.plannedDate.slice(0, 10) : "";
    if (plannedMap.has(pKey)) {
      plannedMap.get(pKey)!.planned += 1;
    }
    if (r.doneAt) {
      const dKey = r.doneAt.slice(0, 10);
      if (plannedMap.has(dKey)) {
        plannedMap.get(dKey)!.done += 1;
      }
    }
  }

  const last7: LandingRateDay[] = [];
  let weekPlanned = 0;
  let weekDone = 0;
  for (let i = 6; i >= 0; i--) {
    const d = toDateString(addDays(startOfDay(today), -i));
    const entry = plannedMap.get(d) ?? { planned: 0, done: 0 };
    weekPlanned += entry.planned;
    weekDone += entry.done;
    last7.push({
      date: d,
      planned: entry.planned,
      done: entry.done,
      rate: entry.planned > 0 ? Math.round((entry.done / entry.planned) * 100) : 0,
    });
  }

  const habitRows = db
    .prepare(
      `SELECT h.id, h.name, h.targetPerWeek, COUNT(hr.id) as thisWeek
       FROM Habit h
       LEFT JOIN HabitRecord hr ON hr.habitId = h.id AND hr.date >= @weekStart
       WHERE h.userId = @userId AND h.archived = 0
       GROUP BY h.id
       ORDER BY h.createdAt ASC`,
    )
    .all({ userId, weekStart }) as {
    id: string;
    name: string;
    targetPerWeek: number;
    thisWeek: number;
  }[];

  const habitIds = habitRows.map((h) => h.id);
  const allRecords = habitIds.length > 0
    ? db
        .prepare(
          `SELECT hr.habitId, hr.date FROM HabitRecord hr
           INNER JOIN Habit h ON h.id = hr.habitId
           WHERE h.userId = @userId
           ORDER BY hr.date ASC`,
        )
        .all({ userId }) as { habitId: string; date: string }[]
    : [];

  const habitRecordMap = new Map<string, Set<string>>();
  for (const r of allRecords) {
    const set = habitRecordMap.get(r.habitId) ?? new Set<string>();
    set.add(r.date);
    habitRecordMap.set(r.habitId, set);
  }

  const habitStats: HabitStreakInfo[] = habitRows.map((h) => {
    const records = habitRecordMap.get(h.id) ?? new Set<string>();
    const streaks: Streaks = computeStreaks(records, today);
    const warningDays = computeWarningDays(records, today, h.targetPerWeek);
    return {
      id: h.id,
      name: h.name,
      targetPerWeek: h.targetPerWeek,
      thisWeek: h.thisWeek,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      warningDays,
    };
  });

  return {
    today,
    week: { total: weekRow.total, done: weekRow.done },
    month: { total: monthRow.total, done: monthRow.done },
    trend: [...counts.entries()].map(([date, count]) => ({ date, count })),
    landingRate: {
      week: {
        planned: weekPlanned,
        done: weekDone,
        rate: weekPlanned > 0 ? Math.round((weekDone / weekPlanned) * 100) : 0,
      },
      last7,
    },
    habits: habitStats,
  };
});

export interface EventWithEntityName extends EventLogEntry {
  entityName: string;
}

export const getEventTimeline = cache(async function getEventTimeline(
  userId: string,
  filter: "all" | "task" | "goal" | "habit" = "all",
  limit = 50,
): Promise<EventWithEntityName[]> {
  const db = getDb();
  const where = filter === "all" ? "" : "AND entityType = @entityType";
  const rows = db
    .prepare(
      `SELECT * FROM EventLog
       WHERE userId = @userId ${where}
       ORDER BY createdAt DESC
       LIMIT @limit`,
    )
    .all(
      filter === "all"
        ? { userId, limit }
        : { userId, entityType: filter, limit },
    ) as {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    before: string | null;
    after: string | null;
    createdAt: string;
  }[];

  const taskIds = new Set<string>();
  const goalIds = new Set<string>();
  const habitIds = new Set<string>();
  for (const row of rows) {
    if (row.entityType === "task") taskIds.add(row.entityId);
    if (row.entityType === "goal") goalIds.add(row.entityId);
    if (row.entityType === "habit") habitIds.add(row.entityId);
  }

  const taskNames = new Map<string, string>();
  if (taskIds.size > 0) {
    const placeholders = Array.from(taskIds).map(() => "?").join(",");
    const taskRows = db
      .prepare(
        `SELECT id, title FROM Task WHERE id IN (${placeholders}) AND userId = ?`,
      )
      .all(...Array.from(taskIds), userId) as { id: string; title: string }[];
    for (const r of taskRows) taskNames.set(r.id, r.title);
  }

  const goalNames = new Map<string, string>();
  if (goalIds.size > 0) {
    const placeholders = Array.from(goalIds).map(() => "?").join(",");
    const goalRows = db
      .prepare(
        `SELECT id, title FROM Goal WHERE id IN (${placeholders}) AND userId = ?`,
      )
      .all(...Array.from(goalIds), userId) as { id: string; title: string }[];
    for (const r of goalRows) goalNames.set(r.id, r.title);
  }

  const habitNames = new Map<string, string>();
  if (habitIds.size > 0) {
    const placeholders = Array.from(habitIds).map(() => "?").join(",");
    const habitRows = db
      .prepare(
        `SELECT id, name FROM Habit WHERE id IN (${placeholders}) AND userId = ?`,
      )
      .all(...Array.from(habitIds), userId) as { id: string; name: string }[];
    for (const r of habitRows) habitNames.set(r.id, r.name);
  }

  return rows.map((row) => {
    const event = rowToEvent(row);
    let entityName = "(已删除)";
    if (row.entityType === "task") entityName = taskNames.get(row.entityId) ?? entityName;
    if (row.entityType === "goal") entityName = goalNames.get(row.entityId) ?? entityName;
    if (row.entityType === "habit") entityName = habitNames.get(row.entityId) ?? entityName;
    return { ...event, entityName };
  });
});

export const getRecentDailies = cache(async function getRecentDailies(
  userId: string,
  limit = 14,
): Promise<DailyEntry[]> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM Daily WHERE userId = @userId
       ORDER BY date DESC LIMIT @limit`,
    )
    .all({ userId, limit }) as {
    id: string;
    date: string;
    focus: string | null;
    win: string | null;
    improve: string | null;
    nextStep: string | null;
  }[];
  return rows.map(rowToDaily);
});
