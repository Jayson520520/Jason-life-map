import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "客戶人生地圖｜人生。房產。學",
  description: "業務人員的客戶人生紀錄工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-paper text-ink antialiased">
        <div className="mx-auto min-h-screen w-full max-w-md">{children}</div>
      </body>
    </html>
  );
}
