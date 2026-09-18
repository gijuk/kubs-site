"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "kubs-theme";

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  // layout.tsx의 인라인 스크립트가 <html>에 이미 클래스를 붙여두므로,
  // 마운트 시 그 상태를 그대로 읽어와 깜빡임 없이 시작합니다.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next);
      return next;
    });
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className={`flex items-center justify-center rounded-full border border-ivory-line text-ink-soft transition-colors hover:border-crimson hover:text-crimson ${className}`}
    >
      {isDark ? (
        <Sun size={15} strokeWidth={1.75} />
      ) : (
        <Moon size={15} strokeWidth={1.75} />
      )}
    </button>
  );
}
