import Link from "next/link";
import { login } from "@/app/actions/auth";

export const metadata = {
  title: "登录 · 经纬",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const hasError = sp.error === "invalid";

  return (
    <div className="mx-auto max-w-sm py-20">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tighter text-ink"
        >
          经纬
        </Link>
        <p className="mt-2 text-sm text-ink-2">登录以继续使用</p>
      </div>

      {hasError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          邮箱或密码错误，请重试。
        </div>
      )}

      <form action={login} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-ink"
          >
            邮箱
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-hairline bg-transparent px-3 py-2 text-ink placeholder:text-ink-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-ink"
          >
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-hairline bg-transparent px-3 py-2 text-ink placeholder:text-ink-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="至少 6 个字符"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          登录
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-2">
        还没有账号？{" "}
        <Link
          href="/register"
          className="font-semibold text-accent hover:underline"
        >
          立即注册
        </Link>
      </p>
    </div>
  );
}
