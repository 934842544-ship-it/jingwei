import { createGoal } from "@/app/actions/goals";
import { toDateInputValue } from "@/lib/date";

export default function GoalForm({
  defaultValues,
  submitLabel = "创建目标",
}: {
  defaultValues?: { title?: string; description?: string; deadline?: Date | null };
  submitLabel?: string;
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
            className="mt-1 border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </label>
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
