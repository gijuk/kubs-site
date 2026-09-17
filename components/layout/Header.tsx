"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "#this-week", label: "이번 주" },
  { href: "#archive", label: "포토 아카이브" },
  { href: "#promotions", label: "홍보 게시판" },
  { href: "#faq", label: "FAQ" },
  { href: "#map", label: "캠퍼스 맵" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-ivory/90 backdrop-blur-sm border-b border-ivory-line"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-editorial items-center justify-between px-6 py-4 md:px-10">
        <a href="#top" className="flex items-baseline gap-2">
          <span className="font-serif text-lg font-semibold tracking-tight text-ink">
            KUBS
          </span>
          <span className="hidden text-xs text-ink-faint sm:inline">
            in one place
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-ink-soft transition-colors hover:text-crimson"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#admin"
            className="rounded-full border border-crimson px-4 py-1.5 text-sm text-crimson transition-colors hover:bg-crimson hover:text-ivory"
          >
            관리자
          </a>
        </nav>

        <button
          className="text-ink md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-ivory-line bg-ivory px-6 py-4 md:hidden">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2.5 text-sm text-ink-soft hover:bg-ivory-soft hover:text-crimson"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
