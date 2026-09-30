# 个人管理系统 (task-manager)

一个基于 Next.js 的个人任务、目标与习惯管理系统，支持云端部署，可通过 MCP 接口由 AI 助手调用。

## 功能模块

- **任务 (Tasks)**: CRUD、完成切换、优先级、截止日期、关联目标、计划日期、WAITING 状态
- **目标 (Goals)**: CRUD、手动进度、自动进度统计（基于关联任务）、状态管理
- **习惯 (Habits)**: CRUD、打卡切换、每周目标、热力图记录、连续天数统计
- **每日 (Daily)**: 每日焦点、三段式复盘（进步/需精进/下一步）
- **事件时间线 (EventLog)**: 所有实体变更的 append-only 事件记录
- **统计面板 (Dashboard)**: 今日概览、逾期任务、等待中、习惯进度、活跃目标、最近事件

## 技术栈

- Next.js (App Router)
- SQLite (via better-sqlite3)
- MCP (Model Context Protocol) 接口支持

## 行为特性说明

### 数值钳制规则

以下输入会被自动钳制到合法范围内，不会报错：

- **目标进度 (`manualProgress`)**: 输入小于 0 自动设为 0，大于 100 自动设为 100
- **习惯每周目标 (`targetPerWeek`)**: 输入小于 1 自动设为 1，大于 7 自动设为 7
- 进度值会自动四舍五入为整数

### 删除目标不级联删除任务

删除一个目标时：
- 该目标下的任务**不会被删除**
- 任务的 `goalId` 会被置为 `null`（成为"孤儿任务"）
- 设计原则：数据不丢失，任务记录保留

### 时区

- 系统所有"今天"的判断统一使用 **Asia/Shanghai** 时区
- 习惯打卡日期以 `YYYY-MM-DD` 字符串存储，无时区偏移问题

### 任务状态

任务有三种状态：

| 状态 | 说明 |
|------|------|
| `OPEN` | 进行中，待完成 |
| `WAITING` | 等外部/阻塞中，带 `waitingOn` 备注和可选 `followUpDate` |
| `DONE` | 已完成 |

- `toggle_task_done` 切换 `DONE` ↔ `OPEN`
- `set_task_waiting` 将任务设为 `WAITING` 状态
- 处于 `WAITING` 状态的任务不记入逾期，单独在 dashboard 展示

### 计划 vs 实际

- 任务有 `plannedDate`（计划哪天做）和 `doneAt`（实际完成时间）
- Stats 接口提供近 7 天落地率（计划数 vs 实际完成数）
- 数据积累后可计算周/月落地率趋势

### 习惯连续与断档预警

- `currentStreak`: 当前连续打卡天数（今天或昨天打过卡）
- `longestStreak`: 历史最长连续天数
- `warningDays`: 距离本周目标还差几天 + 本周剩余可打卡天数，若剩余天数不足以达成目标则预警（>0 表示要断档了）

### 事件时间线

所有实体（task/goal/habit）的变更都会追加记录到 `EventLog` 表：
- 事件类型：`create`, `update`, `delete`, `mark_done`, `mark_open`, `set_waiting`, `set_progress`, `check`, `uncheck`
- 每条事件记录 `before` 和 `after` 字段的 JSON 快照
- append-only，不可修改或删除
- dashboard 展示最近 20 条事件

### 错误码

API 和 MCP 接口使用统一的错误格式：`Error [code]: message`

| 错误码 | 说明 |
|--------|------|
| `not_found` | 资源不存在 |
| `invalid_title` | 标题不能为空 |
| `invalid_name` | 名称不能为空 |
| `invalid_goal` | goalId 不合法 |
| `invalid_status` | 状态值不合法 |
| `invalid_date` | 日期格式不合法 |
| `no_fields` | 没有提供可更新的字段 |

## 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 访问。

## MCP 工具

系统提供 32 个 MCP 工具，可通过 AI 助手直接调用：

**只读 (13)**:
- `get_dashboard`, `get_stats`
- `list_tasks`, `get_task`
- `list_goals`, `get_goal`, `list_goal_tasks`
- `list_habits`, `get_habit`
- `list_recent_events`, `get_task_events`, `get_goal_events`, `get_habit_events`
- `get_daily`, `list_recent_dailies`

**任务 (6)**:
- `create_task`, `update_task`, `toggle_task_done`, `set_task_waiting`, `delete_task`

**目标 (4)**:
- `create_goal`, `update_goal`, `set_goal_progress`, `delete_goal`

**习惯 (4)**:
- `create_habit`, `update_habit`, `toggle_habit_record`, `delete_habit`

**每日 (2)**:
- `set_daily_focus`, `set_daily_reflection`

## 部署

本项目可部署到任何支持 Node.js 的服务器。建议使用 PM2 或类似工具进行进程管理。

> **安全提醒**: 如果部署在公网，强烈建议配置 HTTPS（使用 Caddy 或 Nginx 反向代理），并使用强密码。
