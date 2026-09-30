import { cache } from "react";
import { getDb } from "./db";
import { startOfDay, addDays, startOfWeek, toDateString, getShanghaiToday } from "./date";

export interface GoalWithStats {
  id: string;
  title: string;
  description: string | null;
  deadline: Date | null;
  status: "ACTIVE" | "DONE" | "ARCHIVED";
  manualProgress: number;
  taskTotal: number;
  taskDone: number;
}

export interface TaskWithGoal {
  id: string;
  title: string;
  notes: string | null;
  goalId: string | null;
  priority: "HIGH" | "NORMAL" | "LOW";
  dueDate: Date | null;
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

export interface DashboardData {
  today: Date;
  overdue: TaskWithGoal[];
  dueToday: TaskWithGoal[];
  completedToday: TaskWithGoal[];
  habits: HabitWithRecords[];
  goals: GoalWithStats[];
}

export interface TaskFilters {
  status: "all" | "open" | "done";
  priority: "all" | "HIGH" | "NORMAL" | "LOW";
  goalId: string | "all";
  today: boolean;
}

export interface StatsData {
  today: Date;
  week: { total: number; done: number };
  month: { total: number; done: number };
  trend: { date: string; count: number }[];
  habits: {
    id: string;
    name: string;
    targetPerWeek: number;
    thisWeek: number;
  }[];
}

interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
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

function toGoalStats(row: GoalRow): GoalWithStats {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    deadline: parseDate(row.deadline),
    status: row.status as "ACTIVE" | "DONE" | "ARCHIVED",
    manualProgress: row.manualProgress,
    taskTotal: row.taskTotal,
    taskDone: row.taskDone,
  };
}

export function toTaskWithGoal(row: {
  id: string;
  title: string;
  notes: string | null;
  goalId: string | null;
  priority: string;
  dueDate: string | null;
  done: number;
  doneAt: string | null;
  createdAt: string;
  goalTitle: string | null;
}): TaskWithGoal {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    goalId: row.goalId,
    priority: row.priority as "HIGH" | "NORMAL" | "LOW",
    dueDate: parseDate(row.dueDate),
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

function getGoalsWithStats(userId: string, statusFilter?: string): GoalWithStats[] {
  const db = getDb();
  const where = goalQueryWhere(statusFilter, true);
  const stmt = db.prepare(
    `
    SELECT
      g.id, g.title, g.description, g.deadline, g.status, g.manualProgress,
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
  return rows.map(toGoalStats);
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
      g.id, g.title, g.description, g.deadline, g.status, g.manualProgress,
      COUNT(t.id) as taskTotal,
      SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END) as taskDone
    FROM Goal g
    LEFT JOIN Task t ON t.goalId = g.id
    WHERE g.id = @id AND g.userId = @userId
    GROUP BY g.id
  `,
    )
    .get({ id, userId }) as GoalRow | undefined;
  return row ? toGoalStats(row) : null;
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

    if (filters.status === "open") where.push("t.done = 0");
    if (filters.status === "done") where.push("t.done = 1");
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
        t.done ASC,
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

export const getDashboard = cache(async (userId: string): Promise<DashboardData> => {
  const today = getShanghaiToday();
  const dayStart = toDateString(startOfDay(today));
  const dayEnd = toDateString(addDays(startOfDay(today), 1));

  const db = getDb();

  const overdueRows = db
    .prepare(
      `SELECT t.*, g.title as goalTitle FROM Task t
       LEFT JOIN Goal g ON g.id = t.goalId
       WHERE t.userId = @userId AND t.done = 0 AND t.dueDate < @dayStart
       ORDER BY t.dueDate ASC`,
    )
    .all({ userId, dayStart }) as TaskRow[];

  const dueTodayRows = db
    .prepare(
      `SELECT t.*, g.title as goalTitle FROM Task t
       LEFT JOIN Goal g ON g.id = t.goalId
       WHERE t.userId = @userId AND t.done = 0 AND t.dueDate >= @dayStart AND t.dueDate < @dayEnd
       ORDER BY
         CASE t.priority WHEN 'HIGH' THEN 0 WHEN 'NORMAL' THEN 1 ELSE 2 END,
         t.createdAt DESC`,
    )
    .all({ userId, dayStart, dayEnd }) as TaskRow[];

  const completedRows = db
    .prepare(
      `SELECT t.*, g.title as goalTitle FROM Task t
       LEFT JOIN Goal g ON g.id = t.goalId
       WHERE t.userId = @userId AND t.done = 1 AND t.doneAt >= @dayStart AND t.doneAt < @dayEnd
       ORDER BY t.doneAt DESC`,
    )
    .all({ userId, dayStart, dayEnd }) as TaskRow[];

  const [habits, goals] = await Promise.all([getHabits(userId), getActiveGoals(userId)]);

  return {
    today,
    overdue: overdueRows.map(toTaskWithGoal),
    dueToday: dueTodayRows.map(toTaskWithGoal),
    completedToday: completedRows.map(toTaskWithGoal),
    habits,
    goals,
  };
});

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

  return {
    today,
    week: { total: weekRow.total, done: weekRow.done },
    month: { total: monthRow.total, done: monthRow.done },
    trend: [...counts.entries()].map(([date, count]) => ({ date, count })),
    habits: habitRows.map((h) => ({
      id: h.id,
      name: h.name,
      targetPerWeek: h.targetPerWeek,
      thisWeek: h.thisWeek,
    })),
  };
});
