import Link from "next/link";
import { register } from "@/app/actions/auth";

export const metadata = {
  title: "注册 · 经纬",
};

const ERROR_MESSAGES: Record<string, string> = {
  fields: "请填写所有字段",
  email: "邮箱格式不正确",
  password: "密码至少需要 6 个字符",
  match: "两次密码输入不一致",
  exists: "该邮箱已被注册",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const errorMsg = sp.error ? ERROR_MESSAGES[sp.error] : null;

  return (
    <div className="mx-auto max-w-sm py-20">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tighter text-ink"
        >
          经纬
        </Link>
        <p className="mt-2 text-sm text-ink-2">创建你的账号</p>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      <form action={register} className="space-y-4">
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
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full rounded-md border border-hairline bg-transparent px-3 py-2 text-ink placeholder:text-ink-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="至少 6 个字符"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-sm font-medium text-ink"
          >
            确认密码
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full rounded-md border border-hairline bg-transparent px-3 py-2 text-ink placeholder:text-ink-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="再次输入密码"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          注册
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-2">
        已有账号？{" "}
        <Link
          href="/login"
          className="font-semibold text-accent hover:underline"
        >
          立即登录
        </Link>
      </p>
    </div>
  );
}
