"use client";

import { ChevronDown } from "lucide-react";
import GlassShape from "@/components/common/GlassShape";

function getTodayLabel(): string {
  const now = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}.${String(now.getDate()).padStart(2, "0")} (${days[now.getDay()]})`;
}

export default function HeroSection() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden bg-ivory px-6 pb-10 pt-32 md:px-10 md:pt-40"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-building.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[42%] w-full select-none object-cover object-top opacity-[0.14] sm:h-[50%]"
      />

      <GlassShape
        variant="circle"
        size={240}
        className="-right-20 top-24 hidden md:block"
      />
      <GlassShape
        variant="hex"
        size={120}
        className="left-1/2 top-1/3 hidden md:block"
        spin
      />

      <div className="relative z-10 mx-auto grid w-full max-w-editorial gap-10 md:grid-cols-[1fr_auto] md:items-end">
        <div className="reveal">
          <p className="mb-5 font-serif text-sm text-crimson">
            {getTodayLabel()}
          </p>
          <h1 className="font-serif text-[13vw] font-semibold leading-[0.95] tracking-tight text-ink sm:text-[9vw] md:text-[6.4vw] lg:text-[86px]">
            KUBS,
            <br />
            IN ONE PLACE
          </h1>
        </div>

        <div
          className="reveal max-w-[34ch] text-sm leading-relaxed text-ink-soft md:text-right md:text-[15px]"
          style={{ "--reveal-delay": "150ms" } as React.CSSProperties}
        >
          <p>
            학사 일정부터 학생회 소식, 사진 아카이브, 자주 묻는 질문까지 —
            고려대 경영대학 생활에 필요한 정보를 한 화면에 모았습니다.
          </p>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-editorial items-center justify-between border-t border-ivory-line pt-6">
        <p className="text-xs text-ink-faint">
          경영대 학생회가 직접 운영하는 비공식 정보 사이트
        </p>
        <a
          href="#this-week"
          className="group flex items-center gap-2 text-xs text-ink-soft transition-colors hover:text-crimson"
          aria-label="이번 주 섹션으로 스크롤"
        >
          스크롤
          <ChevronDown
            size={16}
            className="animate-bounce-slow"
            strokeWidth={1.75}
          />
        </a>
      </div>
    </section>
  );
}
