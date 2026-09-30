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
  setTaskWaiting,
  addChecklistItem,
  toggleChecklistItem,
  removeChecklistItem,
  createGoal,
  updateGoal,
  deleteGoal,
  setManualProgress,
  setProgressMode,
  createHabit,
  updateHabit,
  deleteHabit,
  toggleHabitRecord,
  upsertDaily,
  getDaily,
  getRecentDailies,
  getEventsForEntity,
  getRecentEvents,
  type ChecklistItemInput,
} from "@/lib/services";
import { toDateString, startOfDay, getShanghaiToday } from "@/lib/date";

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
    description:
      "Get today's dashboard: daily focus/reflection, overdue tasks, due today, waiting tasks, completed today, active habits, active goals, and recent events.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_stats",
    description:
      "Get stats: week/month task totals, 30-day completion trend, landing rate (planned vs actual last 7 days), and habit streaks with break warnings.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_tasks",
    description: "List tasks with optional filters (status, priority, goalId, today-only).",
    inputSchema: {
      type: "object",
      properties: {
        status: T.enumStr("Filter by task status", ["all", "open", "waiting", "done"]),
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

  // ---------- Events ----------
  {
    name: "list_recent_events",
    description: "List recent event log entries across all entities (task/goal/habit).",
    inputSchema: {
      type: "object",
      properties: {
        limit: T.number("Maximum number of events to return (default 30)"),
      },
    },
  },
  {
    name: "get_task_events",
    description: "Get event history for a specific task.",
    inputSchema: {
      type: "object",
      properties: {
        id: T.string("Task id"),
        limit: T.number("Maximum events (default 20)"),
      },
      required: ["id"],
    },
  },
  {
    name: "get_goal_events",
    description: "Get event history for a specific goal.",
    inputSchema: {
      type: "object",
      properties: {
        id: T.string("Goal id"),
        limit: T.number("Maximum events (default 20)"),
      },
      required: ["id"],
    },
  },
  {
    name: "get_habit_events",
    description: "Get event history for a specific habit.",
    inputSchema: {
      type: "object",
      properties: {
        id: T.string("Habit id"),
        limit: T.number("Maximum events (default 20)"),
      },
      required: ["id"],
    },
  },

  // ---------- Daily ----------
  {
    name: "get_daily",
    description: "Get the daily entry (focus + reflection) for a specific date (defaults to today).",
    inputSchema: {
      type: "object",
      properties: {
        date: T.string("Date in YYYY-MM-DD format (defaults to today)"),
      },
    },
  },
  {
    name: "set_daily_focus",
    description: "Set the daily focus — the one thing that must be won today.",
    inputSchema: {
      type: "object",
      properties: {
        focus: T.string("The daily focus statement"),
        date: T.string("Date in YYYY-MM-DD format (defaults to today)"),
      },
      required: ["focus"],
    },
  },
  {
    name: "set_daily_reflection",
    description: "Set the daily reflection: wins, improvements, and next steps.",
    inputSchema: {
      type: "object",
      properties: {
        win: T.string("What went well today / progress"),
        improve: T.string("What needs improvement"),
        nextStep: T.string("Next step / action item"),
        date: T.string("Date in YYYY-MM-DD format (defaults to today)"),
      },
    },
  },
  {
    name: "list_recent_dailies",
    description: "List recent daily entries (focus + reflection), most recent first.",
    inputSchema: {
      type: "object",
      properties: {
        limit: T.number("Maximum number of days (default 7)"),
      },
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
        plannedDate: T.string("Planned date in YYYY-MM-DD or ISO 8601 format"),
        estimatedMinutes: T.number("Estimated time to complete in minutes"),
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
        plannedDate: T.string("New planned date (empty string to clear)"),
        status: T.enumStr("New status", ["OPEN", "WAITING", "DONE"]),
        waitingOn: T.string("What/who you are waiting for (empty string to clear)"),
        followUpDate: T.string("Follow-up date for waiting task (empty string to clear)"),
        estimatedMinutes: T.number("New estimated minutes (null to clear)"),
      },
      required: ["id"],
    },
  },
  {
    name: "add_checklist_item",
    description: "Add a checklist item to a task.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: T.string("Task id"),
        text: T.string("Checklist item text"),
      },
      required: ["taskId", "text"],
    },
  },
  {
    name: "toggle_checklist_item",
    description: "Toggle the done state of a checklist item.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: T.string("Task id"),
        itemId: T.string("Checklist item id"),
      },
      required: ["taskId", "itemId"],
    },
  },
  {
    name: "remove_checklist_item",
    description: "Remove a checklist item from a task.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: T.string("Task id"),
        itemId: T.string("Checklist item id"),
      },
      required: ["taskId", "itemId"],
    },
  },
  {
    name: "toggle_task_done",
    description: "Toggle the done state of a task. Returns the new state and status.",
    inputSchema: {
      type: "object",
      properties: { id: T.string("Task id") },
      required: ["id"],
    },
  },
  {
    name: "set_task_waiting",
    description:
      "Mark a task as WAITING on something/someone, with optional follow-up date.",
    inputSchema: {
      type: "object",
      properties: {
        id: T.string("Task id"),
        waitingOn: T.string("What or who you are waiting for"),
        followUpDate: T.string("Date to follow up (YYYY-MM-DD or ISO 8601)"),
      },
      required: ["id", "waitingOn"],
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
        parentId: T.string("Parent goal id for sub-goals (empty string for top-level)"),
        progressMode: T.enumStr("Progress calculation mode", ["AUTO", "MANUAL"]),
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
        parentId: T.string("New parent goal id (empty string to make top-level)"),
        progressMode: T.enumStr("New progress mode", ["AUTO", "MANUAL"]),
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
    name: "set_goal_progress_mode",
    description: "Set the progress mode (AUTO or MANUAL) for a goal.",
    inputSchema: {
      type: "object",
      properties: {
        id: T.string("Goal id"),
        mode: T.enumStr("Progress mode", ["AUTO", "MANUAL"]),
      },
      required: ["id", "mode"],
    },
  },
  {
    name: "list_goal_children",
    description: "List sub-goals (children) of a specific goal.",
    inputSchema: {
      type: "object",
      properties: { parentId: T.string("Parent goal id") },
      required: ["parentId"],
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
    if (!task) return textResult("Error [not_found]: Resource not found");
    return jsonResult({ task });
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
    if (!goal) return textResult("Error [not_found]: Resource not found");
    return jsonResult({ goal });
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
    if (!habit) return textResult("Error [not_found]: Resource not found");
    return jsonResult({ habit });
  },

  // Events
  async list_recent_events(userId, args) {
    const limit = asNumber(args.limit) ?? 30;
    const events = getRecentEvents(userId, Math.max(1, Math.min(100, limit)));
    return jsonResult({ events });
  },
  async get_task_events(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const limit = asNumber(args.limit) ?? 20;
    const events = getEventsForEntity(userId, "task", id, Math.max(1, Math.min(100, limit)));
    return jsonResult({ events });
  },
  async get_goal_events(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const limit = asNumber(args.limit) ?? 20;
    const events = getEventsForEntity(userId, "goal", id, Math.max(1, Math.min(100, limit)));
    return jsonResult({ events });
  },
  async get_habit_events(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const limit = asNumber(args.limit) ?? 20;
    const events = getEventsForEntity(userId, "habit", id, Math.max(1, Math.min(100, limit)));
    return jsonResult({ events });
  },

  // Daily
  async get_daily(userId, args) {
    const dateStr = asString(args.date);
    let date: string;
    if (dateStr) {
      if (Number.isNaN(Date.parse(dateStr))) {
        return textResult("Error [invalid_date]: date must be a valid date in YYYY-MM-DD or ISO 8601 format");
      }
      date = toDateString(startOfDay(new Date(dateStr)));
    } else {
      date = toDateString(startOfDay(getShanghaiToday()));
    }
    const daily = getDaily(userId, date);
    return jsonResult({ daily });
  },
  async set_daily_focus(userId, args) {
    const focus = asString(args.focus);
    if (focus === undefined) return textResult("Error: focus is required");
    const dateStr = asString(args.date);
    let date: string;
    if (dateStr) {
      if (Number.isNaN(Date.parse(dateStr))) {
        return textResult("Error [invalid_date]: date must be a valid date in YYYY-MM-DD or ISO 8601 format");
      }
      date = toDateString(startOfDay(new Date(dateStr)));
    } else {
      date = toDateString(startOfDay(getShanghaiToday()));
    }
    const result = upsertDaily(userId, date, { focus });
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const daily = getDaily(userId, date);
    return jsonResult({ daily });
  },
  async set_daily_reflection(userId, args) {
    const win = asNullableString(args.win);
    const improve = asNullableString(args.improve);
    const nextStep = asNullableString(args.nextStep);
    if (win === undefined && improve === undefined && nextStep === undefined) {
      return textResult("Error: at least one of win, improve, nextStep is required");
    }
    const dateStr = asString(args.date);
    let date: string;
    if (dateStr) {
      if (Number.isNaN(Date.parse(dateStr))) {
        return textResult("Error [invalid_date]: date must be a valid date in YYYY-MM-DD or ISO 8601 format");
      }
      date = toDateString(startOfDay(new Date(dateStr)));
    } else {
      date = toDateString(startOfDay(getShanghaiToday()));
    }
    const result = upsertDaily(userId, date, { win, improve, nextStep });
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const daily = getDaily(userId, date);
    return jsonResult({ daily });
  },
  async list_recent_dailies(userId, args) {
    const limit = asNumber(args.limit) ?? 7;
    const dailies = getRecentDailies(userId, Math.max(1, Math.min(30, limit)));
    return jsonResult({ dailies });
  },

  // Write: Tasks
  async create_task(userId, args) {
    const result = createTask(userId, {
      title: asString(args.title) ?? "",
      notes: asNullableString(args.notes),
      goalId: asNullableString(args.goalId),
      priority: asString(args.priority) ?? null,
      dueDate: asNullableString(args.dueDate),
      plannedDate: asNullableString(args.plannedDate),
      estimatedMinutes: asNumber(args.estimatedMinutes),
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
      plannedDate: asNullableString(args.plannedDate),
      status: asString(args.status),
      waitingOn: asNullableString(args.waitingOn),
      followUpDate: asNullableString(args.followUpDate),
      estimatedMinutes: asNumber(args.estimatedMinutes),
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
    return jsonResult({ done: result.data.done, status: result.data.status });
  },
  async set_task_waiting(userId, args) {
    const id = asString(args.id);
    const waitingOn = asString(args.waitingOn);
    if (!id || !waitingOn) return textResult("Error: id and waitingOn are required");
    const followUpDate = asNullableString(args.followUpDate);
    const result = setTaskWaiting(userId, id, waitingOn, followUpDate);
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const task = await getTask(userId, id);
    return jsonResult({ task });
  },
  async add_checklist_item(userId, args) {
    const taskId = asString(args.taskId);
    const text = asString(args.text);
    if (!taskId || !text) return textResult("Error: taskId and text are required");
    const result = addChecklistItem(userId, taskId, text);
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const task = await getTask(userId, taskId);
    return jsonResult({ itemId: result.data.itemId, task });
  },
  async toggle_checklist_item(userId, args) {
    const taskId = asString(args.taskId);
    const itemId = asString(args.itemId);
    if (!taskId || !itemId) return textResult("Error: taskId and itemId are required");
    const result = toggleChecklistItem(userId, taskId, itemId);
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const task = await getTask(userId, taskId);
    return jsonResult({ done: result.data.done, task });
  },
  async remove_checklist_item(userId, args) {
    const taskId = asString(args.taskId);
    const itemId = asString(args.itemId);
    if (!taskId || !itemId) return textResult("Error: taskId and itemId are required");
    const result = removeChecklistItem(userId, taskId, itemId);
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const task = await getTask(userId, taskId);
    return jsonResult({ removed: true, task });
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
      parentId: asNullableString(args.parentId),
      progressMode: (asString(args.progressMode) as "AUTO" | "MANUAL" | undefined),
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
      parentId: asNullableString(args.parentId),
      progressMode: (asString(args.progressMode) as "AUTO" | "MANUAL" | undefined),
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
  async set_goal_progress_mode(userId, args) {
    const id = asString(args.id);
    const mode = asString(args.mode);
    if (!id || !mode) return textResult("Error: id and mode are required");
    const result = setProgressMode(userId, id, mode as "AUTO" | "MANUAL");
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    const goal = await getGoal(userId, id);
    return jsonResult({ goal });
  },
  async list_goal_children(userId, args) {
    const parentId = asString(args.parentId);
    if (!parentId) return textResult("Error: parentId is required");
    const goals = await getGoals(userId);
    const children = goals.filter((g) => g.parentId === parentId);
    return jsonResult({ goals: children });
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
    let date: Date | undefined;
    if (dateStr !== undefined) {
      if (Number.isNaN(Date.parse(dateStr))) {
        return textResult("Error [invalid_date]: date must be a valid date in YYYY-MM-DD or ISO 8601 format");
      }
      date = new Date(dateStr);
    }
    const result = toggleHabitRecord(userId, habitId, date);
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    return jsonResult({ recorded: result.data.recorded, date: result.data.date });
  },
  async delete_habit(userId, args) {
    const id = asString(args.id);
    if (!id) return textResult("Error: id is required");
    const result = deleteHabit(userId, id);
    if (!result.ok) return textResult(`Error [${result.code}]: ${result.message}`);
    return jsonResult({ deleted: true, id });
  },
};
