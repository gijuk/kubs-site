import type { Metadata } from "next";
import { Noto_Serif_KR } from "next/font/google";
import ScrollReveal from "@/components/common/ScrollReveal";
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
    <html lang="ko" className={notoSerifKR.variable} suppressHydrationWarning>
      <head>
        {/* 다크모드 깜빡임(FOUC) 방지: 하이드레이션 전에 동기적으로 실행됩니다. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('kubs-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <ScrollReveal />
      </body>
    </html>
  );
}
