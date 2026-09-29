import { createTask } from "@/app/actions/tasks";
import type { GoalWithStats } from "@/lib/queries";
import { toDateInputValue } from "@/lib/date";

export default function TaskForm({
  goals = [],
  defaultGoalId,
  defaultDueDate,
  submitLabel = "创建任务",
}: {
  goals?: GoalWithStats[];
  defaultGoalId?: string;
  defaultDueDate?: Date;
  submitLabel?: string;
}) {
  return (
    <form action={createTask} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-ink-2">
          标题
          <input
            name="title"
            required
            className="mt-1 w-full border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            placeholder="输入任务内容"
          />
        </label>
      </div>
      <div>
        <label className="block text-xs font-semibold text-ink-2">
          备注（可选）
          <textarea
            name="notes"
            rows={2}
            className="mt-1 w-full border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            placeholder="补充说明"
          />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-ink-2">
            关联目标
            <select
              name="goalId"
              defaultValue={defaultGoalId ?? ""}
              className="mt-1 w-full border border-hairline bg-paper px-2 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            >
              <option value="">无</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-2">
            优先级
            <select
              name="priority"
              defaultValue="NORMAL"
              className="mt-1 w-full border border-hairline bg-paper px-2 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            >
              <option value="HIGH">高</option>
              <option value="NORMAL">中</option>
              <option value="LOW">低</option>
            </select>
          </label>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-2">
            截止日期
            <input
              type="date"
              name="dueDate"
              defaultValue={
                defaultDueDate ? toDateInputValue(defaultDueDate) : ""
              }
              className="mt-1 w-full border border-hairline bg-paper px-2 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </label>
        </div>
      </div>
      <button
        type="submit"
        className="bg-accent px-4 py-2 text-sm font-semibold text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}
