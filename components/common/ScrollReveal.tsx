"use client";

import { useEffect } from "react";

/**
 * 페이지 어디에나 있는 ".reveal" 요소를 감시해서, 스크롤로 화면에 들어오면
 * "in-view"를 붙여 globals.css의 fade-up 애니메이션을 한 번 재생시킵니다.
 * 레이아웃에 한 번만 마운트하면 됩니다.
 *
 * 처음 로드된 요소뿐 아니라, 필터·검색·페이지 이동으로 나중에 DOM에 추가되는
 * .reveal 요소도 MutationObserver로 잡아서 감시합니다. (그러지 않으면 새로 나타난
 * 요소가 opacity: 0 인 채로 영영 보이지 않습니다.)
 */
export default function ScrollReveal() {
  useEffect(() => {
    const seen = new WeakSet<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );

    const watch = (el: Element) => {
      if (seen.has(el) || el.classList.contains("in-view")) return;
      seen.add(el);
      io.observe(el);
    };

    const watchTree = (root: Element | Document) => {
      if (root instanceof Element && root.matches(".reveal")) watch(root);
      root.querySelectorAll(".reveal").forEach(watch);
    };

    watchTree(document);

    const mo = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) watchTree(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
