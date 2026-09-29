import {
  getDashboard,
  getStats,
  getGoals,
  getGoal,
  getGoalTasks,
  getTasks,
  getTask,
  getHabits,
  getHabit,
  type TaskFilters,
} from "@/lib/queries";
import {
  createTask,
  updateTask,
  deleteTask,
  toggleTaskDone,
  createGoal,
  updateGoal,
  deleteGoal,
  setManualProgress,
  createHabit,
  updateHabit,
  deleteHabit,
  toggleHabitRecord,
  type ServiceResult,
} from "@/lib/services";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export type McpToolHandler = (
  userId: string,
  args: Record<string, unknown>,
) => Promise<{ content: { type: "text"; text: string }[] }>;

const T = {
  string: (description: string) => ({ type: "string", description }),
  number: (description: string) => ({ type: "number", description }),
  boolean: (description: string) => ({ type: "boolean", description }),
  enumStr: (description: string, values: string[]) => ({
    type: "string",
    description,
    enum: values,
  }),
};

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function jsonResult(data: unknown) {
  return textResult(JSON.stringify(data, null, 2));
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function asNullableString(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  return v === null ? null : typeof v === "string" ? v : String(v);
}
function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function asBoolean(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

export const MCP_TOOLS: McpTool[] = [
  // ---------- Read ----------
  {
    name: "get_dashboard",
    description: "Get today's dashboard: overdue tasks, due today, completed today, active habits, active goals.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_stats",
    description: "Get task completion stats for this week, this month, 30-day trend, and habit progress this week.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_tasks",
    description: "List tasks with optional filters (status, priority, goalId, today-only).",
    inputSchema: {
      type: "object",
      properties: {
        status: T.enumStr("Filter by completion status", ["all", "open", "done"]),
        priority: T.enumStr("Filter by priority", ["all", "HIGH", "NORMAL", "LOW"]),
        goalId: T.string("Filter by goal id, or 'all' for all"),
        today: T.boolean("Only show tasks due before end of today"),
      },
    },
  },
  {
    name: "get_task",
    description: "Get a single task by id.",
    inputSchema: {
      type: "object",
      properties: { id: T.string("Task id") },
      required: ["id"],
    },
  },
  {
    name: "list_goals",
    description: "List goals, optionally filtered by status.",
    inputSchema: {
      type: "object",
      properties: {
        status: T.enumStr("Filter by goal status", ["ACTIVE", "DONE", "ARCHIVED"]),
      },
    },
  },
  {
    name: "get_goal",
    description: "Get a single goal by id.",
    inputSchema: {
      type: "object",
      properties: { id: T.string("Goal id") },
      required: ["id"],
    },
  },
  {
    name: "list_goal_tasks",
    description: "List tasks belonging to a specific goal.",
    inputSchema: {
      type: "object",
      properties: { goalId: T.string("Goal id") },
      required: ["goalId"],
    },
  },
  {
    name: "list_habits",
    description: "List active habits with recent 91-day record dates.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_habit",
    description: "Get a single habit by id.",
    inputSchema: {
      type: "object",
      properties: { id: T.string("Habit id") },
      required: ["id"],
    },
  },

  // ---------- Write: Tasks ----------
  {
    name: "create_task",
    description: "Create a new task.",
    inputSchema: {
      type: "object",
      properties: {
        title: T.string("Task title (required)"),
        notes: T.string("Additional notes"),
        goalId: T.string("Associated goal id"),
        priority: T.enumStr("Priority level", ["HIGH", "NORMAL", "LOW"]),
        dueDate: T.string("Due date in ISO 8601 format"),
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Update fields of an existing task.",
    inputSchema: {
      type: "object",
      properties: {
        id: T.string("Task id"),
        title: T.string("New title"),
        notes: T.string("New notes (empty string to clear)"),
        goalId: T.string("New goal id (empty string to unlink)"),
        priority: T.enumStr("New priority", ["HIGH", "NORMAL", "LOW"]),
        dueDate: T.string("New due date in ISO 8601 (empty string to clear)"),
      },
      required: ["id"],
    },
  },
  {
    name: "toggle_task_done",
    description: "Toggle the done state of a task. Returns the new state.",
    inputSchema: {
      type: "object",
      properties: { id: T.string("Task id") },
      required: ["id"],
    },
  },
  {
    name: "delete_task",
    description: "Delete a task by id.",
    inputSchema: {
      type: "object",
      properties: { id: T.string("Task id") },
      required: ["id"],
    },
  },

  // ---------- Write: Goals ----------
  {
    name: "create_goal",
    description: "Create a new goal.",
    inputSchema: {
      type: "object",
      properties: {
        title: T.string("Goal title (required)"),
        description: T.string("Goal description"),
        deadline: T.string("Deadline in ISO 8601 format"),
      },
      required: ["title"],
    },
  },
  {
    name: "update_goal",
    description: "Update fields of an existing goal.",
    inputSchema: {
      type: "object",
      properties: {
        id: T.string("Goal id"),
        title: T.string("New title"),
        description: T.string("New description (empty string to clear)"),
        deadline: T.string("New deadline (empty string to clear)"),
        status: T.enumStr("New status", ["ACTIVE", "DONE", "ARCHIVED"]),
        manualProgress: T.number("Manual progress percentage, 0-100"),
      },
      required: ["id"],
    },
  },
  {
    name: "set_goal_progress",
    description: "Set the manual progress percentage (0-100) for a goal.",
    inputSchema: {
      type: "object",
      properties: {
        id: T.string("Goal id"),
        progress: T.number("Progress 0-100"),
      },
      required: ["id", "progress"],
    },
  },
  {
    name: "delete_goal",
    description: "Delete a goal by id.",
    inputSchema: {
      type: "object",
      properties: { id: T.string("Goal id") },
      required: ["id"],
    },
  },

  // ---------- Write: Habits ----------
  {
    name: "create_habit",
    description: "Create a new habit.",
    inputSchema: {
      type: "object",
      properties: {
        name: T.string("Habit name (required)"),
        targetPerWeek: T.number("Target days per week, 1-7 (default 7)"),
      },
      required: ["name"],
    },
  },
  {
    name: "update_habit",
    description: "Update fields of an existing habit.",
    inputSchema: {
      type: "object",
      properties: {
        id: T.string("Habit id"),
        name: T.string("New name"),
        targetPerWeek: T.number("New target per week (1-7)"),
        archived: T.boolean("Whether the habit is archived"),
      },
      required: ["id"],
    },
  },
  {
    name: "toggle_habit_record",
    description: "Toggle whether a habit was recorded on a given date (defaults to today).",
    inputSchema: {
      type: "object",
      properties: {
        habitId: T.string("Habit id"),
        date: T.string("Date in YYYY-MM-DD or ISO 8601 format"),
      },
      required: ["habitId"],
    },
  },
  {
    name: "delete_habit",
    description: "Delete a habit by id.",
    inputSchema: {
      type: "object",
      properties: { id: T.string("Habit id") },
      required: ["id"],
    },
  },
];

export const MCP_TOOL_HANDLERS: Record<string, McpToolHandler> = {
  // Read
  async get_dashboard(userId) {
    const data = await getDashboard(userId);
    return jsonResult(data);
  },
  async get_stats(userId) {
    const data = await getStats(userId);
    return jsonResult(data);
  },
  async list_tasks(userId, args) {
    const filters: TaskFilters = {
      status: (args.status as TaskFilters["status"]) ?? "all",
      priority: (args.priority as TaskFilters["priority"]) ?? "all",
      goalId: (args.goalId as string) ?? "all",
      today: !!args.today,
    };
    const tasks = await getTasks(userId, filters);
    return jsonResult({ tasks });
  },
  async get_task(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const task = await getTask(userId, id);
    return jsonResult({ task: task ?? null });
  },
  async list_goals(userId, args) {
    const goals = await getGoals(userId);
    const status = asString(args.status);
    const filtered = status ? goals.filter((g) => g.status === status) : goals;
    return jsonResult({ goals: filtered });
  },
  async get_goal(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const goal = await getGoal(userId, id);
    return jsonResult({ goal: goal ?? null });
  },
  async list_goal_tasks(userId, args) {
    const goalId = asString(args.goalId);
    if (!goalId) return textResult("Error: goalId is required");
    const tasks = await getGoalTasks(userId, goalId);
    return jsonResult({ tasks });
  },
  async list_habits(userId) {
    const habits = await getHabits(userId);
    return jsonResult({ habits });
  },
  async get_habit(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const habit = await getHabit(userId, id);
    return jsonResult({ habit: habit ?? null });
  },

  // Write: Tasks
  async create_task(userId, args) {
    const result = createTask(userId, {
      title: asString(args.title) ?? "",
      notes: asNullableString(args.notes),
      goalId: asNullableString(args.goalId),
      priority: asString(args.priority) ?? null,
      dueDate: asNullableString(args.dueDate),
    });
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const task = await getTask(userId, result.data.id);
    return jsonResult({ task });
  },
  async update_task(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const result = updateTask(userId, id, {
      title: asString(args.title),
      notes: asNullableString(args.notes),
      goalId: asNullableString(args.goalId),
      priority: asString(args.priority),
      dueDate: asNullableString(args.dueDate),
    });
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const task = await getTask(userId, id);
    return jsonResult({ task });
  },
  async toggle_task_done(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const result = toggleTaskDone(userId, id);
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    return jsonResult({ done: result.data.done });
  },
  async delete_task(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const result = deleteTask(userId, id);
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    return jsonResult({ deleted: true, id });
  },

  // Write: Goals
  async create_goal(userId, args) {
    const result = createGoal(userId, {
      title: asString(args.title) ?? "",
      description: asNullableString(args.description),
      deadline: asNullableString(args.deadline),
    });
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const goal = await getGoal(userId, result.data.id);
    return jsonResult({ goal });
  },
  async update_goal(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const result = updateGoal(userId, id, {
      title: asString(args.title),
      description: asNullableString(args.description),
      deadline: asNullableString(args.deadline),
      status: asString(args.status),
      manualProgress: asNumber(args.manualProgress),
    });
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const goal = await getGoal(userId, id);
    return jsonResult({ goal });
  },
  async set_goal_progress(userId, args) {
    const id = asString(args.id);
    const progress = asNumber(args.progress);
    if (!id || progress === undefined) return textResult("Error: id and progress are required");
    const result = setManualProgress(userId, id, progress);
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const goal = await getGoal(userId, id);
    return jsonResult({ goal });
  },
  async delete_goal(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const result = deleteGoal(userId, id);
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    return jsonResult({ deleted: true, id });
  },

  // Write: Habits
  async create_habit(userId, args) {
    const result = createHabit(userId, {
      name: asString(args.name) ?? "",
      targetPerWeek: asNumber(args.targetPerWeek),
    });
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const habit = await getHabit(userId, result.data.id);
    return jsonResult({ habit });
  },
  async update_habit(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const result = updateHabit(userId, id, {
      name: asString(args.name),
      targetPerWeek: asNumber(args.targetPerWeek),
      archived: asBoolean(args.archived),
    });
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const habit = await getHabit(userId, id);
    return jsonResult({ habit });
  },
  async toggle_habit_record(userId, args) {
    const habitId = asString(args.habitId);
    if (!habitId) return textResult("Error: habitId is required");
    const dateStr = asString(args.date);
    const date = dateStr && !Number.isNaN(Date.parse(dateStr))
      ? new Date(dateStr)
      : undefined;
    const result = toggleHabitRecord(userId, habitId, date);
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    return jsonResult({ recorded: result.data.recorded });
  },
  async delete_habit(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const result = deleteHabit(userId, id);
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    return jsonResult({ deleted: true, id });
  },
};
