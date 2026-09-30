# 个人管理系统 (task-manager)

一个基于 Next.js 的个人任务、目标与习惯管理系统，支持云端部署，可通过 MCP 接口由 AI 助手调用。

## 功能模块

- **任务 (Tasks)**: CRUD、完成切换、优先级、截止日期、关联目标
- **目标 (Goals)**: CRUD、手动进度、自动进度统计（基于关联任务）、状态管理
- **习惯 (Habits)**: CRUD、打卡切换、每周目标、热力图记录
- **统计面板 (Dashboard)**: 今日概览、逾期任务、习惯进度、活跃目标

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

系统提供 21 个 MCP 工具（读 9 + 写 12），可通过 AI 助手直接调用：

- **只读**: `get_dashboard`, `get_stats`, `list_tasks`, `get_task`, `list_goals`, `get_goal`, `list_goal_tasks`, `list_habits`, `get_habit`
- **任务**: `create_task`, `update_task`, `toggle_task_done`, `delete_task`
- **目标**: `create_goal`, `update_goal`, `set_goal_progress`, `delete_goal`
- **习惯**: `create_habit`, `update_habit`, `toggle_habit_record`, `delete_habit`

## 部署

本项目可部署到任何支持 Node.js 的服务器。建议使用 PM2 或类似工具进行进程管理。

> **安全提醒**: 如果部署在公网，强烈建议配置 HTTPS（使用 Caddy 或 Nginx 反向代理），并使用强密码。
