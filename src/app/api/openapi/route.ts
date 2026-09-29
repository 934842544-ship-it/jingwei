import { jsonOk, methodNotAllowed } from "@/lib/api/http";

const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Task Manager API",
    version: "1.0.0",
    description: "REST API for the task-manager application. Supports Bearer-token auth and browser session cookies. Also exposes an MCP endpoint at /api/mcp.",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Token obtained from POST /api/auth/login",
      },
    },
    schemas: {
      Priority: { type: "string", enum: ["HIGH", "NORMAL", "LOW"] },
      GoalStatus: { type: "string", enum: ["ACTIVE", "DONE", "ARCHIVED"] },
      Task: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          notes: { type: ["string", "null"] },
          goalId: { type: ["string", "null"] },
          priority: { $ref: "#/components/schemas/Priority" },
          dueDate: { type: ["string", "null"], format: "date-time" },
          done: { type: "boolean" },
          doneAt: { type: ["string", "null"], format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          goal: {
            type: ["object", "null"],
            properties: {
              id: { type: "string" },
              title: { type: "string" },
            },
          },
        },
      },
      Goal: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: ["string", "null"] },
          deadline: { type: ["string", "null"], format: "date-time" },
          status: { $ref: "#/components/schemas/GoalStatus" },
          manualProgress: { type: "integer", minimum: 0, maximum: 100 },
          taskTotal: { type: "integer" },
          taskDone: { type: "integer" },
        },
      },
      Habit: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          targetPerWeek: { type: "integer", minimum: 1, maximum: 7 },
          archived: { type: "boolean" },
          records: { type: "array", items: { type: "string" } },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          code: { type: "string" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/login": {
      post: {
        summary: "Login with email and password",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful", content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" }, user: { type: "object" } } } } } },
          "400": { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/register": {
      post: {
        summary: "Create a new user",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "User created" },
          "400": { description: "Bad request" },
        },
      },
    },
    "/auth/me": {
      get: {
        summary: "Get current user",
        responses: {
          "200": { description: "Current user" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/dashboard": {
      get: {
        summary: "Get dashboard overview",
        responses: { "200": { description: "Dashboard data" }, "401": { description: "Unauthorized" } },
      },
    },
    "/stats": {
      get: {
        summary: "Get task/habit stats",
        responses: { "200": { description: "Stats data" }, "401": { description: "Unauthorized" } },
      },
    },
    "/tasks": {
      get: {
        summary: "List tasks",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["all", "open", "done"] } },
          { name: "priority", in: "query", schema: { type: "string", enum: ["all", "HIGH", "NORMAL", "LOW"] } },
          { name: "goalId", in: "query", schema: { type: "string" } },
          { name: "today", in: "query", schema: { type: "string", enum: ["0", "1"] } },
        ],
        responses: { "200": { description: "Task list" }, "401": { description: "Unauthorized" } },
      },
      post: {
        summary: "Create a task",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["title"], properties: { title: { type: "string" }, notes: { type: "string" }, goalId: { type: "string" }, priority: { $ref: "#/components/schemas/Priority" }, dueDate: { type: "string" } } } } },
        },
        responses: { "201": { description: "Task created" }, "400": { description: "Bad request" }, "401": { description: "Unauthorized" } },
      },
    },
    "/tasks/{id}": {
      get: { summary: "Get a task", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Task" }, "404": { description: "Not found" } } },
      patch: {
        summary: "Update a task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, notes: { type: ["string", "null"] }, goalId: { type: ["string", "null"] }, priority: { $ref: "#/components/schemas/Priority" }, dueDate: { type: ["string", "null"] } } } } } },
        responses: { "200": { description: "Updated task" }, "400": { description: "Bad request" }, "404": { description: "Not found" } },
      },
      delete: {
        summary: "Delete a task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" }, "404": { description: "Not found" } },
      },
    },
    "/tasks/{id}/toggle": {
      post: {
        summary: "Toggle task done state",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "New done state" }, "404": { description: "Not found" } },
      },
    },
    "/goals": {
      get: {
        summary: "List goals",
        parameters: [{ name: "status", in: "query", schema: { $ref: "#/components/schemas/GoalStatus" } }],
        responses: { "200": { description: "Goal list" } },
      },
      post: {
        summary: "Create a goal",
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["title"], properties: { title: { type: "string" }, description: { type: "string" }, deadline: { type: "string" } } } } } },
        responses: { "201": { description: "Goal created" } },
      },
    },
    "/goals/{id}": {
      get: { summary: "Get a goal", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Goal" }, "404": { description: "Not found" } } },
      patch: {
        summary: "Update a goal",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, description: { type: ["string", "null"] }, deadline: { type: ["string", "null"] }, status: { $ref: "#/components/schemas/GoalStatus" }, manualProgress: { type: "integer", minimum: 0, maximum: 100 } } } } } },
        responses: { "200": { description: "Updated goal" }, "404": { description: "Not found" } },
      },
      delete: { summary: "Delete a goal", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "204": { description: "Deleted" } } },
    },
    "/goals/{id}/tasks": {
      get: { summary: "List tasks under a goal", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Task list" } } },
    },
    "/goals/{id}/progress": {
      patch: {
        summary: "Set goal manual progress",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["progress"], properties: { progress: { type: "integer", minimum: 0, maximum: 100 } } } } } },
        responses: { "200": { description: "Updated goal" }, "404": { description: "Not found" } },
      },
    },
    "/habits": {
      get: { summary: "List habits", responses: { "200": { description: "Habit list" } } },
      post: {
        summary: "Create a habit",
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, targetPerWeek: { type: "integer", minimum: 1, maximum: 7 } } } } } },
        responses: { "201": { description: "Habit created" } },
      },
    },
    "/habits/{id}": {
      get: { summary: "Get a habit", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Habit" }, "404": { description: "Not found" } } },
      patch: {
        summary: "Update a habit",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, targetPerWeek: { type: "integer", minimum: 1, maximum: 7 }, archived: { type: "boolean" } } } } } },
        responses: { "200": { description: "Updated habit" }, "404": { description: "Not found" } },
      },
      delete: { summary: "Delete a habit", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "204": { description: "Deleted" } } },
    },
    "/habits/{id}/records/toggle": {
      post: {
        summary: "Toggle habit record",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { date: { type: "string" } } } } } },
        responses: { "200": { description: "New record state" }, "404": { description: "Not found" } },
      },
    },
  },
};

export function GET() {
  return jsonOk(openapi);
}

export function POST() {
  return methodNotAllowed();
}
