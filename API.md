# Task Manager API 文档

> 基于 Next.js 16 App Router 的任务/目标/习惯管理系统 API。同时提供 **REST API** 和 **MCP（Model Context Protocol）** 两种调用方式。

---

## 目录

1. [基础信息](#基础信息)
2. [认证方式](#认证方式)
3. [错误处理](#错误处理)
4. [REST API 参考](#rest-api-参考)
   - [认证接口](#认证接口)
   - [任务接口](#任务接口)
   - [目标接口](#目标接口)
   - [习惯接口](#习惯接口)
   - [数据面板](#数据面板)
   - [API 索引与规范](#api-索引与规范)
5. [MCP 接口](#mcp-接口)
   - [连接方式](#连接方式)
   - [可用工具](#可用工具)
   - [调用示例](#调用示例)
6. [数据模型](#数据模型)

---

## 基础信息

| 项目 | 值 |
|------|-----|
| 基础路径 | `http://<host>:<port>/api` |
| 内容类型 | `application/json; charset=utf-8` |
| 认证方式 | Bearer Token（推荐） / Session Cookie（浏览器） |
| 字符编码 | UTF-8 |
| 时间格式 | ISO 8601（如 `2026-09-29T06:04:15.361Z`） |

---

## 认证方式

### 1. Bearer Token（推荐，用于 MCP / 程序化调用）

先用邮箱密码登录获取 token，之后在请求头中携带：

```
Authorization: Bearer <token>
```

### 2. Session Cookie（浏览器）

浏览器登录后自动设置 `session` Cookie，API 也能识别。

### 认证失败

返回 `401 Unauthorized`：
```json
{
  "error": "Unauthorized: obtain a token via POST /api/auth/login and send it as 'Authorization: Bearer <token>'"
}
```

---

## 错误处理

所有错误响应均为统一格式：

```json
{
  "error": "人类可读的错误描述",
  "code": "错误码（可选）"
}
```

常见 HTTP 状态码：

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无响应体） |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 404 | 资源不存在 |
| 405 | 方法不允许 |

---

## REST API 参考

### 认证接口

#### POST `/api/auth/register` — 注册

请求体：
```json
{
  "email": "you@example.com",
  "password": "secret123"
}
```

响应（201）：
```json
{
  "token": "dab49cc6b17f...",
  "user": {
    "id": "caqeqlaahm9u2dc",
    "email": "you@example.com",
    "createdAt": "2026-09-29T06:04:15.361Z"
  }
}
```

#### POST `/api/auth/login` — 登录

请求体同上注册，响应同注册。

#### GET `/api/auth/me` — 获取当前用户

需要认证。

---

### 任务接口

#### GET `/api/tasks` — 任务列表

**查询参数**（均可选）：

| 参数 | 类型 | 可选值 | 默认 | 说明 |
|------|------|--------|------|------|
| `status` | string | `all` / `open` / `done` | `all` | 完成状态 |
| `priority` | string | `all` / `HIGH` / `NORMAL` / `LOW` | `all` | 优先级 |
| `goalId` | string | 目标 ID 或 `all` | `all` | 所属目标 |
| `today` | string | `1` / `0` | `0` | 仅显示今日到期 |

响应：
```json
{
  "tasks": [
    {
      "id": "c0plmhgrkm9uswl",
      "title": "Buy milk",
      "notes": "2%",
      "goalId": null,
      "priority": "HIGH",
      "dueDate": null,
      "done": false,
      "doneAt": null,
      "createdAt": "2026-09-29T06:05:00.000Z",
      "goal": null
    }
  ]
}
```

#### POST `/api/tasks` — 创建任务

请求体：
```json
{
  "title": "Buy milk",
  "notes": "2% fat",
  "goalId": "czb3pvi7rm9ut43",
  "priority": "HIGH",
  "dueDate": "2026-10-01T00:00:00.000Z"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | 是 | 任务标题，非空 |
| `notes` | 否 | 备注，传空字符串或 `null` 表示清空 |
| `goalId` | 否 | 关联目标 ID，传空字符串或 `null` 表示不关联 |
| `priority` | 否 | `HIGH` / `NORMAL` / `LOW`，默认 `NORMAL` |
| `dueDate` | 否 | ISO 8601 日期字符串，传空字符串或 `null` 表示无截止 |

#### GET `/api/tasks/:id` — 获取单个任务

#### PATCH `/api/tasks/:id` — 更新任务

请求体字段同创建，均为可选（仅传需要修改的字段）。

#### DELETE `/api/tasks/:id` — 删除任务

返回 `204 No Content`。

#### POST `/api/tasks/:id/toggle` — 切换完成状态

响应：
```json
{ "done": true }
```

---

### 目标接口

#### GET `/api/goals` — 目标列表

查询参数：
- `status` — 可选 `ACTIVE` / `DONE` / `ARCHIVED`

响应：
```json
{
  "goals": [
    {
      "id": "czb3pvi7rm9ut43",
      "title": "Learn Next.js",
      "description": "Master the new version",
      "deadline": null,
      "status": "ACTIVE",
      "manualProgress": 0,
      "taskTotal": 0,
      "taskDone": 0
    }
  ]
}
```

#### POST `/api/goals` — 创建目标

请求体：
```json
{
  "title": "Learn Next.js",
  "description": "Master the new version",
  "deadline": "2026-12-31T00:00:00.000Z"
}
```

#### GET `/api/goals/:id` — 获取单个目标

#### PATCH `/api/goals/:id` — 更新目标

可更新字段：`title`、`description`、`deadline`、`status`（`ACTIVE`/`DONE`/`ARCHIVED`）、`manualProgress`（0-100）。

#### DELETE `/api/goals/:id` — 删除目标

#### GET `/api/goals/:id/tasks` — 目标下的任务列表

#### PATCH `/api/goals/:id/progress` — 设置手动进度

请求体：
```json
{ "progress": 75 }
```

---

### 习惯接口

#### GET `/api/habits` — 习惯列表

响应：
```json
{
  "habits": [
    {
      "id": "cxasdf123",
      "name": "Morning run",
      "targetPerWeek": 5,
      "archived": false,
      "records": ["2026-09-28", "2026-09-29"]
    }
  ]
}
```

> `records` 为最近 91 天的打卡日期（YYYY-MM-DD 格式）。

#### POST `/api/habits` — 创建习惯

请求体：
```json
{
  "name": "Morning run",
  "targetPerWeek": 5
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 习惯名称 |
| `targetPerWeek` | 否 | 每周目标天数，1-7，默认 7 |

#### GET `/api/habits/:id` — 获取单个习惯

#### PATCH `/api/habits/:id` — 更新习惯

可更新字段：`name`、`targetPerWeek`、`archived`（布尔值）。

#### DELETE `/api/habits/:id` — 删除习惯

#### POST `/api/habits/:id/records/toggle` — 切换打卡

请求体（可选）：
```json
{ "date": "2026-09-29" }
```

不传 `date` 默认为今天。响应：
```json
{ "recorded": true }
```

---

### 数据面板

#### GET `/api/dashboard` — 首页仪表盘

返回今日概览：逾期任务、今日任务、今日完成、活跃习惯、活跃目标。

```json
{
  "today": "2026-09-29T06:00:00.000Z",
  "overdue": [ /* TaskWithGoal[] */ ],
  "dueToday": [ /* TaskWithGoal[] */ ],
  "completedToday": [ /* TaskWithGoal[] */ ],
  "habits": [ /* HabitWithRecords[] */ ],
  "goals": [ /* GoalWithStats[] */ ]
}
```

#### GET `/api/stats` — 统计数据

```json
{
  "today": "...",
  "week":  { "total": 10, "done": 7 },
  "month": { "total": 40, "done": 25 },
  "trend": [
    { "date": "2026-09-01", "count": 2 },
    { "date": "2026-09-02", "count": 1 }
  ],
  "habits": [
    { "id": "...", "name": "Morning run", "targetPerWeek": 5, "thisWeek": 3 }
  ]
}
```

---

### API 索引与规范

| 端点 | 说明 |
|------|------|
| `GET /api` | API 索引页，列出所有端点 |
| `GET /api/openapi` | OpenAPI 3.1 规范（机器可读） |

---

## MCP 接口

本系统提供 **MCP（Model Context Protocol）** 端点，AI Agent 可通过它直接操作任务、目标和习惯数据。

### 连接方式

| 项目 | 值 |
|------|-----|
| 端点 | `POST /api/mcp` |
| 协议 | JSON-RPC 2.0 over HTTP |
| 认证 | `Authorization: Bearer <token>` |
| 协议版本 | `2024-11-05` |

**支持的 JSON-RPC 方法**：

| 方法 | 说明 |
|------|------|
| `initialize` | 握手，返回服务器信息和能力 |
| `tools/list` | 列出所有可用工具 |
| `tools/call` | 调用指定工具 |

### 可用工具（21 个）

#### 读取类

| 工具名 | 说明 |
|--------|------|
| `get_dashboard` | 获取今日仪表盘（逾期/今日任务、活跃习惯/目标等） |
| `get_stats` | 获取统计数据（本周/本月完成数、30 天趋势、习惯进度） |
| `list_tasks` | 列出任务，可按 status / priority / goalId / today 过滤 |
| `get_task` | 获取单个任务详情 |
| `list_goals` | 列出目标，可按 status 过滤 |
| `get_goal` | 获取单个目标详情 |
| `list_goal_tasks` | 列出某个目标下的所有任务 |
| `list_habits` | 列出活跃习惯（含最近 91 天记录） |
| `get_habit` | 获取单个习惯详情 |

#### 任务写入

| 工具名 | 说明 |
|--------|------|
| `create_task` | 创建新任务（title 必填，可选 notes/goalId/priority/dueDate） |
| `update_task` | 更新任务（可部分更新） |
| `toggle_task_done` | 切换任务完成状态 |
| `delete_task` | 删除任务 |

#### 目标写入

| 工具名 | 说明 |
|--------|------|
| `create_goal` | 创建新目标（title 必填） |
| `update_goal` | 更新目标（title/description/deadline/status/manualProgress） |
| `set_goal_progress` | 设置目标手动进度（0-100） |
| `delete_goal` | 删除目标 |

#### 习惯写入

| 工具名 | 说明 |
|--------|------|
| `create_habit` | 创建新习惯（name 必填，可选 targetPerWeek） |
| `update_habit` | 更新习惯（name/targetPerWeek/archived） |
| `toggle_habit_record` | 切换某日打卡记录（默认今天，可传 date 参数） |
| `delete_habit` | 删除习惯 |

### 调用示例

#### 1. 初始化握手

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize"
  }'
```

响应：
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "task-manager", "version": "1.0.0" }
  }
}
```

#### 2. 列出工具

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

#### 3. 调用工具：创建任务

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "create_task",
      "arguments": {
        "title": "Buy milk",
        "priority": "HIGH",
        "notes": "2% fat"
      }
    }
  }'
```

响应：
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"task\":{\"id\":\"c0plmhgrkm9uswl\",\"title\":\"Buy milk\",...}}"
      }
    ]
  }
}
```

> 工具调用结果统一为 `content` 数组，每个元素的 `text` 字段是 JSON 字符串，需要再 `JSON.parse` 一次得到结构化数据。

#### 4. 调用工具：获取仪表盘

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "get_dashboard",
    "arguments": {}
  }
}
```

#### 5. 错误响应

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "error": {
    "code": -32601,
    "message": "Unknown tool: nonexistent_tool"
  }
}
```

---

## 数据模型

### Task（任务）

```typescript
interface Task {
  id: string;
  title: string;
  notes: string | null;
  goalId: string | null;
  priority: "HIGH" | "NORMAL" | "LOW";
  dueDate: string | null;       // ISO 8601
  done: boolean;
  doneAt: string | null;        // ISO 8601
  createdAt: string;            // ISO 8601
  goal: { id: string; title: string } | null;
}
```

### Goal（目标）

```typescript
interface Goal {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;      // ISO 8601
  status: "ACTIVE" | "DONE" | "ARCHIVED";
  manualProgress: number;       // 0 - 100
  taskTotal: number;
  taskDone: number;
}
```

### Habit（习惯）

```typescript
interface Habit {
  id: string;
  name: string;
  targetPerWeek: number;        // 1 - 7
  archived: boolean;
  records: string[];            // YYYY-MM-DD，最近 91 天
}
```

---

## 在其他项目中使用

### 方式一：直接 HTTP 调用（REST）

任何支持 HTTP 的语言都可以调用：

```python
import requests

BASE = "http://localhost:3000/api"
TOKEN = "your-token-here"
headers = {"Authorization": f"Bearer {TOKEN}"}

# 获取任务列表
r = requests.get(f"{BASE}/tasks?status=open", headers=headers)
tasks = r.json()["tasks"]

# 创建任务
r = requests.post(f"{BASE}/tasks", json={
    "title": "Review API docs",
    "priority": "HIGH"
}, headers=headers)
new_task = r.json()["task"]
```

### 方式二：MCP 接入

在支持 MCP 的客户端（如 Claude Desktop、Trae 等）配置中添加：

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-http",
        "http://localhost:3000/api/mcp",
        "--header", "Authorization: Bearer <your-token>"
      ]
    }
  }
}
```

> 也可以用任何支持「HTTP 传输 + Bearer Token 认证」的 MCP SDK 直接连接。

---

## 附录：快速开始

```bash
# 1. 启动服务
npm run dev

# 2. 注册账号
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"secret123"}'

# 3. 复制返回的 token，后续调用都带上
# 4. 查看所有 API
curl http://localhost:3000/api -H "Authorization: Bearer <token>"

# 5. 查看 OpenAPI 规范
curl http://localhost:3000/api/openapi -H "Authorization: Bearer <token>"
```
