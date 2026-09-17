"use client";

import { Search } from "lucide-react";

interface FaqSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function FaqSearchBar({ value, onChange }: FaqSearchBarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-ink/20 py-3">
      <Search size={18} strokeWidth={1.75} className="text-ink-faint" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="궁금한 내용을 검색해보세요"
        className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </div>
  );
}
