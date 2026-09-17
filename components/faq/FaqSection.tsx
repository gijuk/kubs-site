"use client";

import { useMemo, useState } from "react";
import { faqItems } from "@/lib/mock-data";
import type { FaqCategory } from "@/lib/types";
import FaqSearchBar from "./FaqSearchBar";
import FaqCategoryFilter from "./FaqCategoryFilter";
import FaqAccordionItem from "./FaqAccordionItem";

const CATEGORIES: FaqCategory[] = [
  "학사",
  "장학/등록",
  "학생회",
  "시설",
  "교환/유학",
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
    <section id="faq" className="border-t border-ivory-line bg-ivory px-6 py-24 md:px-10">
      <div className="mx-auto max-w-editorial">
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
      </div>
    </section>
  );
}
