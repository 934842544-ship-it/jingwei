import { jsonOk, methodNotAllowed } from "@/lib/api/http";

const API_INDEX = {
  name: "Task Manager API",
  version: "1.0.0",
  description: "REST API and MCP endpoint for the task-manager application.",
  authentication: "Use POST /api/auth/login to obtain a token. Send it as 'Authorization: Bearer <token>' on subsequent requests. Browser cookie sessions are also accepted.",
  mcp: {
    endpoint: "/api/mcp",
    protocol: "jsonrpc-over-http",
    transport: "POST with JSON-RPC 2.0 body, Authorization: Bearer <token>",
    methods: ["initialize", "tools/list", "tools/call"],
  },
  endpoints: [
    { path: "/api/auth/login", method: "POST", description: "Login with email + password, returns a bearer token." },
    { path: "/api/auth/register", method: "POST", description: "Create a new user account." },
    { path: "/api/auth/me", method: "GET", description: "Get the authenticated user's info." },
    { path: "/api/dashboard", method: "GET", description: "Today's dashboard overview." },
    { path: "/api/stats", method: "GET", description: "Task/habit stats and 30-day completion trend." },
    { path: "/api/tasks", method: "GET", description: "List tasks with filters (status, priority, goalId, today)." },
    { path: "/api/tasks", method: "POST", description: "Create a new task." },
    { path: "/api/tasks/:id", method: "GET", description: "Get a single task." },
    { path: "/api/tasks/:id", method: "PATCH", description: "Update a task." },
    { path: "/api/tasks/:id", method: "DELETE", description: "Delete a task." },
    { path: "/api/tasks/:id/toggle", method: "POST", description: "Toggle task done state." },
    { path: "/api/goals", method: "GET", description: "List goals (optionally filter by status)." },
    { path: "/api/goals", method: "POST", description: "Create a new goal." },
    { path: "/api/goals/:id", method: "GET", description: "Get a single goal." },
    { path: "/api/goals/:id", method: "PATCH", description: "Update a goal." },
    { path: "/api/goals/:id", method: "DELETE", description: "Delete a goal." },
    { path: "/api/goals/:id/tasks", method: "GET", description: "List tasks under a goal." },
    { path: "/api/goals/:id/progress", method: "PATCH", description: "Set a goal's manual progress." },
    { path: "/api/habits", method: "GET", description: "List active habits." },
    { path: "/api/habits", method: "POST", description: "Create a new habit." },
    { path: "/api/habits/:id", method: "GET", description: "Get a single habit." },
    { path: "/api/habits/:id", method: "PATCH", description: "Update a habit." },
    { path: "/api/habits/:id", method: "DELETE", description: "Delete a habit." },
    { path: "/api/habits/:id/records/toggle", method: "POST", description: "Toggle a habit record for a date." },
  ],
  docs: {
    openapi: "/api/openapi",
  },
};

export function GET() {
  return jsonOk(API_INDEX);
}

export function POST() {
  return methodNotAllowed();
}
