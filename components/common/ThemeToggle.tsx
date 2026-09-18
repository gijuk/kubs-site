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
  // 마운트 시 그 상태를 그대로 읽어옵니다. 읽기 전에는 라벨이 잠깐 틀려 보일 수 있어 숨겨둡니다.
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
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
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ivory-line px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-crimson hover:text-crimson ${
        mounted ? "" : "invisible"
      } ${className}`}
    >
      {isDark ? (
        <Sun size={14} strokeWidth={1.75} />
      ) : (
        <Moon size={14} strokeWidth={1.75} />
      )}
      {isDark ? "라이트 모드로 변경" : "다크 모드로 변경"}
    </button>
  );
}
