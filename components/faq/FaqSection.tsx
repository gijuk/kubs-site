"use client";

import { useMemo, useState } from "react";
import { faqItems, FAQ_LAST_VERIFIED } from "@/lib/data/faq";
import type { FaqCategory } from "@/lib/types";
import FaqSearchBar from "./FaqSearchBar";
import FaqCategoryFilter from "./FaqCategoryFilter";
import FaqAccordionItem from "./FaqAccordionItem";
import GlassShape from "@/components/common/GlassShape";

const CATEGORIES: FaqCategory[] = [
  "전공",
  "학사",
  "장학/등록",
  "교환/유학",
  "시설",
  "학생회",
];

export default function FaqSection() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "전체">("전체");

  const filtered = useMemo(() => {
    return faqItems.filter((item) => {
      const matchesCategory = category === "전체" || item.category === category;
      const matchesQuery =
        query.trim().length === 0 ||
        item.question.includes(query) ||
        item.answer.includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  return (
    <section
      id="faq"
      className="relative overflow-hidden border-t border-ivory-line bg-ivory px-6 py-24 md:px-10"
    >
      <GlassShape
        variant="blob"
        size={200}
        className="-left-16 bottom-0 hidden md:block"
      />
      <GlassShape
        variant="diamond"
        size={90}
        className="right-10 top-10 hidden md:block"
        spin
      />

      <div className="relative z-10 mx-auto max-w-editorial">
        <div className="reveal">
          <p className="mb-2 text-sm text-crimson">FAQ</p>
          <h2 className="font-serif text-3xl font-semibold text-ink md:text-4xl">
            자주 묻는 질문
          </h2>
        </div>

        <div className="mt-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <FaqCategoryFilter
            categories={CATEGORIES}
            active={category}
            onChange={setCategory}
          />
          <div className="w-full md:max-w-xs">
            <FaqSearchBar value={query} onChange={setQuery} />
          </div>
        </div>

        <div className="mt-6">
          {filtered.length > 0 ? (
            filtered.map((item, index) => (
              <FaqAccordionItem key={item.id} item={item} index={index} />
            ))
          ) : (
            <p className="py-12 text-center text-sm text-ink-faint">
              검색 결과가 없습니다. 다른 키워드로 시도해보세요.
            </p>
          )}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-ink-faint">
          답변은 고려대학교 공식 페이지를 바탕으로 {FAQ_LAST_VERIFIED}에 확인한
          내용이에요. 제도와 일정은 학기마다 바뀔 수 있으니, 중요한 사항은
          각 답변의 출처와 포털 공지에서 최종 확인해주세요.
        </p>
      </div>
    </section>
  );
}
