import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/user";
import { logout } from "@/app/actions/auth";
import NavLinks from "./NavLinks";

export default async function Masthead() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-8 gap-y-2 px-6 pt-8 pb-0">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tighter text-ink"
        >
          经纬
        </Link>
        {user ? (
          <div className="flex items-center gap-6">
            <NavLinks />
            <form action={logout} className="flex items-center gap-3">
              <span className="text-sm text-ink-2 truncate max-w-[12rem]">
                {user.email}
              </span>
              <button
                type="submit"
                className="text-sm font-semibold text-ink-2 hover:text-ink"
              >
                退出
              </button>
            </form>
          </div>
        ) : (
          <nav className="flex gap-4">
            <Link
              href="/login"
              className="pb-3 text-sm font-semibold text-ink-2 hover:text-ink"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="pb-3 text-sm font-semibold text-accent hover:underline"
            >
              注册
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
