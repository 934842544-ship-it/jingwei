"use client";

import { useTransition, useState } from "react";
import { setManualProgress } from "@/app/actions/goals";

export default function ManualProgress({
  goalId,
  initial,
}: {
  goalId: string;
  initial: number;
}) {
  const [value, setValue] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    setValue(v);
    startTransition(async () => {
      await setManualProgress(goalId, v);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-ink-2">手动进度</span>
        <span className="nums text-2xl font-bold text-ink">
          {value}
          <span className="text-sm font-medium">%</span>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={onChange}
        disabled={isPending}
        className="w-full accent-accent"
      />
      <p className="text-xs text-ink-2">
        拖动滑块更新进度。当目标有关联任务时，进度由任务完成情况自动计算。
      </p>
    </div>
  );
}
