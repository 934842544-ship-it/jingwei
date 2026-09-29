import type { Metadata } from "next";
import "./globals.css";
import Masthead from "@/components/layout/Masthead";

export const metadata: Metadata = {
  title: "经纬 · 目标任务习惯",
  description: "目标、任务、习惯，一个网格梳理清楚。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Masthead />
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
