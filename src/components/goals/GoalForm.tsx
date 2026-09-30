import { createGoal } from "@/app/actions/goals";
import { toDateInputValue } from "@/lib/date";
import type { GoalWithStats } from "@/lib/queries";

export default function GoalForm({
  defaultValues,
  submitLabel = "创建目标",
  goals = [],
  defaultParentId,
}: {
  defaultValues?: { title?: string; description?: string; deadline?: Date | null };
  submitLabel?: string;
  goals?: GoalWithStats[];
  defaultParentId?: string;
}) {
  return (
    <form action={createGoal} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-ink-2">
          标题
          <input
            name="title"
            defaultValue={defaultValues?.title ?? ""}
            required
            className="mt-1 w-full border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            placeholder="输入目标名称"
          />
        </label>
      </div>
      <div>
        <label className="block text-xs font-semibold text-ink-2">
          描述（可选）
          <textarea
            name="description"
            defaultValue={defaultValues?.description ?? ""}
            rows={2}
            className="mt-1 w-full border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            placeholder="补充说明"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-ink-2">
            截止日期（可选）
            <input
              type="date"
              name="deadline"
              defaultValue={
                defaultValues?.deadline
                  ? toDateInputValue(defaultValues.deadline)
                  : ""
              }
              className="mt-1 w-full border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </label>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-2">
            进度模式
            <select
              name="progressMode"
              defaultValue="MANUAL"
              className="mt-1 w-full border border-hairline bg-paper px-2 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            >
              <option value="MANUAL">手动</option>
              <option value="AUTO">自动（按任务+子目标）</option>
            </select>
          </label>
        </div>
      </div>
      {goals.length > 0 ? (
        <div>
          <label className="block text-xs font-semibold text-ink-2">
            父目标（可选）
            <select
              name="parentId"
              defaultValue={defaultParentId ?? ""}
              className="mt-1 w-full border border-hairline bg-paper px-2 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            >
              <option value="">无（顶级目标）</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      <button
        type="submit"
        className="bg-accent px-4 py-2 text-sm font-semibold text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}
