import type { Metadata } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KUBS, IN ONE PLACE",
  description:
    "고려대학교 경영대학 학생들을 위한 비공식 정보 허브. 학사 일정, 학생회 소식, 사진 아카이브, FAQ를 한 곳에서 확인하세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={notoSerifKR.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
