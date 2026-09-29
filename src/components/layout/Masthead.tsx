"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "今日" },
  { href: "/goals", label: "目标" },
  { href: "/tasks", label: "任务" },
  { href: "/habits", label: "习惯" },
  { href: "/stats", label: "统计" },
];

export default function Masthead() {
  const pathname = usePathname();

  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-8 gap-y-2 px-6 pt-8 pb-0">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tighter text-ink"
        >
          经纬
        </Link>
        <nav className="flex" aria-label="主导航">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px border-b-2 px-4 pb-3 text-sm ${
                  active
                    ? "border-accent font-semibold text-accent"
                    : "border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
