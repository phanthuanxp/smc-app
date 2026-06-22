import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Shop Management Core",
  description: "Quản lý shop đa kênh tập trung – TikTok, Shopee, Lazada, Tiki, Facebook, Website",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} h-full`}>
      <body className="h-full bg-[#f6f8fc]">{children}</body>
    </html>
  );
}
