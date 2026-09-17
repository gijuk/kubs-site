"use client";

import { useEffect } from "react";

/**
 * 페이지 어디에나 있는 ".reveal" 요소를 감시해서, 스크롤로 화면에 들어오면
 * "in-view"를 붙여 globals.css의 fade-up 애니메이션을 한 번 재생시킵니다.
 * 레이아웃에 한 번만 마운트하면 됩니다.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(".reveal"));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
