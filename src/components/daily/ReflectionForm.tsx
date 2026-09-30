"use client";

import { useTransition } from "react";
import { setDailyReflection } from "@/app/actions/daily";

export default function ReflectionForm({
  date,
  defaultValues = { win: "", improve: "", nextStep: "" },
}: {
  date: string;
  defaultValues?: { win: string; improve: string; nextStep: string };
}) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    formData.set("date", date);
    startTransition(async () => {
      await setDailyReflection(formData);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-ink-2">
          今天的进步（win）
          <textarea
            name="win"
            defaultValue={defaultValues.win}
            rows={3}
            className="mt-1 w-full border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            placeholder="今天做成了什么、有什么小胜利..."
          />
        </label>
      </div>
      <div>
        <label className="block text-xs font-semibold text-ink-2">
          需要精进（improve）
          <textarea
            name="improve"
            defaultValue={defaultValues.improve}
            rows={3}
            className="mt-1 w-full border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            placeholder="哪里可以做得更好、遇到了什么问题..."
          />
        </label>
      </div>
      <div>
        <label className="block text-xs font-semibold text-ink-2">
          下一步（nextStep）
          <textarea
            name="nextStep"
            defaultValue={defaultValues.nextStep}
            rows={3}
            className="mt-1 w-full border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            placeholder="明天要做什么、下一步行动..."
          />
        </label>
      </div>
      <div className="text-right">
        <button
          type="submit"
          disabled={isPending}
          className="bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "保存中..." : "保存复盘"}
        </button>
      </div>
    </form>
  );
}
