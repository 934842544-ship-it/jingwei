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

export default function NavLinks() {
  const pathname = usePathname();

  return (
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
  );
}
