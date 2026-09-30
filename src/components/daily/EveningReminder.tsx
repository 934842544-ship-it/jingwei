"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function EveningReminder({
  hasReflectionToday,
}: {
  hasReflectionToday: boolean;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 20 && !hasReflectionToday) {
      setShow(true);
    }
  }, [hasReflectionToday]);

  if (!show) return null;

  return (
    <div className="mb-8 border border-accent/30 bg-accent/5 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink">
          今天还没写复盘，花 3 分钟回顾一下吧。
        </p>
        <Link
          href="/reflection"
          className="shrink-0 text-sm font-semibold text-accent hover:underline"
        >
          去写复盘 →
        </Link>
      </div>
    </div>
  );
}
