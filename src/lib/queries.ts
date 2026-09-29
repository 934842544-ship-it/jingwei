import { cache } from "react";
import { getDb } from "./db";
import { startOfDay, addDays, startOfWeek, toDateString } from "./date";

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

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toGoalStats(row: {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  manualProgress: number;
  taskTotal: number;
  taskDone: number;
}): GoalWithStats {
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

function toTaskWithGoal(row: {
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

function goalQueryWhere(statusFilter?: string) {
  const where: string[] = [];
  if (statusFilter) where.push("g.status = @status");
  return where.length ? `WHERE ${where.join(" AND ")}` : "";
}

function getGoalsWithStats(statusFilter?: string): GoalWithStats[] {
  const db = getDb();
  const where = goalQueryWhere(statusFilter);
  const rows = db
    .prepare(
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
    )
    .all(statusFilter ? { status: statusFilter } : undefined) as any[];
  return rows.map(toGoalStats);
}

export const getGoals = cache(async (): Promise<GoalWithStats[]> => {
  return getGoalsWithStats();
});

export const getGoal = cache(async (id: string): Promise<GoalWithStats | null> => {
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
    WHERE g.id = @id
    GROUP BY g.id
  `,
    )
    .get({ id }) as any;
  return row ? toGoalStats(row) : null;
});

export const getGoalTasks = cache(
  async (goalId: string): Promise<TaskWithGoal[]> => {
    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT t.*, g.title as goalTitle
      FROM Task t
      LEFT JOIN Goal g ON g.id = t.goalId
      WHERE t.goalId = @goalId
      ORDER BY
        t.done ASC,
        t.dueDate IS NULL, t.dueDate ASC,
        t.createdAt DESC
    `,
      )
      .all({ goalId }) as any[];
    return rows.map(toTaskWithGoal);
  },
);

export const getTasks = cache(
  async (filters: TaskFilters): Promise<TaskWithGoal[]> => {
    const today = new Date();
    const dayStart = toDateString(startOfDay(today));
    const dayEnd = toDateString(addDays(startOfDay(today), 1));

    const where: string[] = [];
    const params: Record<string, any> = {};

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
      .all(params) as any[];
    return rows.map(toTaskWithGoal);
  },
);

const HEATMAP_DAYS = 91;

export const getHabits = cache(async (): Promise<HabitWithRecords[]> => {
  const db = getDb();
  const since = toDateString(
    addDays(startOfDay(new Date()), -(HEATMAP_DAYS - 1)),
  );

  const habits = db
    .prepare(
      `SELECT id, name, targetPerWeek FROM Habit
       WHERE archived = 0 ORDER BY createdAt ASC`,
    )
    .all() as { id: string; name: string; targetPerWeek: number }[];

  const records = db
    .prepare(
      `SELECT habitId, date FROM HabitRecord WHERE date >= @since ORDER BY date ASC`,
    )
    .all({ since }) as { habitId: string; date: string }[];

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
    records: map.get(h.id) ?? [],
  }));
});

export const getActiveGoals = cache(async (): Promise<GoalWithStats[]> => {
  return getGoalsWithStats("ACTIVE");
});

export const getDashboard = cache(async (): Promise<DashboardData> => {
  const today = new Date();
  const dayStart = toDateString(startOfDay(today));
  const dayEnd = toDateString(addDays(startOfDay(today), 1));

  const db = getDb();

  const overdueRows = db
    .prepare(
      `SELECT t.*, g.title as goalTitle FROM Task t
       LEFT JOIN Goal g ON g.id = t.goalId
       WHERE t.done = 0 AND t.dueDate < @dayStart
       ORDER BY t.dueDate ASC`,
    )
    .all({ dayStart }) as any[];

  const dueTodayRows = db
    .prepare(
      `SELECT t.*, g.title as goalTitle FROM Task t
       LEFT JOIN Goal g ON g.id = t.goalId
       WHERE t.done = 0 AND t.dueDate >= @dayStart AND t.dueDate < @dayEnd
       ORDER BY
         CASE t.priority WHEN 'HIGH' THEN 0 WHEN 'NORMAL' THEN 1 ELSE 2 END,
         t.createdAt DESC`,
    )
    .all({ dayStart, dayEnd }) as any[];

  const completedRows = db
    .prepare(
      `SELECT t.*, g.title as goalTitle FROM Task t
       LEFT JOIN Goal g ON g.id = t.goalId
       WHERE t.done = 1 AND t.doneAt >= @dayStart AND t.doneAt < @dayEnd
       ORDER BY t.doneAt DESC`,
    )
    .all({ dayStart, dayEnd }) as any[];

  const [habits, goals] = await Promise.all([getHabits(), getActiveGoals()]);

  return {
    today,
    overdue: overdueRows.map(toTaskWithGoal),
    dueToday: dueTodayRows.map(toTaskWithGoal),
    completedToday: completedRows.map(toTaskWithGoal),
    habits,
    goals,
  };
});

export const getStats = cache(async (): Promise<StatsData> => {
  const today = new Date();
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
       FROM Task WHERE createdAt >= @weekStart`,
    )
    .get({ weekStart }) as { total: number; done: number };

  const monthRow = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as done
       FROM Task WHERE createdAt >= @monthStart`,
    )
    .get({ monthStart }) as { total: number; done: number };

  const doneRows = db
    .prepare(
      `SELECT doneAt FROM Task WHERE done = 1 AND doneAt >= @since30`,
    )
    .all({ since30 }) as { doneAt: string }[];

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
       WHERE h.archived = 0
       GROUP BY h.id
       ORDER BY h.createdAt ASC`,
    )
    .all({ weekStart }) as {
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
