"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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

// 처음에는 이 개수만 보여주고, "질문 더보기"를 누르면 나머지를 펼칩니다.
const INITIAL_VISIBLE = 6;

export default function FaqSection() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "전체">("전체");
  const [expanded, setExpanded] = useState(false);

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

  // 검색 중에는 접어둔 항목에 결과가 숨지 않도록 일치하는 걸 모두 보여줍니다.
  const isSearching = query.trim().length > 0;
  const collapsible = !isSearching && filtered.length > INITIAL_VISIBLE;
  const visible =
    collapsible && !expanded ? filtered.slice(0, INITIAL_VISIBLE) : filtered;

  const handleCollapse = () => {
    setExpanded(false);
    // 긴 목록 맨 아래에서 접으면 화면이 엉뚱한 곳에 남으니, FAQ 맨 위로 되돌립니다.
    document
      .getElementById("faq")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
          {visible.length > 0 ? (
            visible.map((item, index) => (
              <FaqAccordionItem
                key={item.id}
                item={item}
                // 더보기로 새로 나타난 항목들이 위에서부터 차례로 등장하도록 순번을 다시 매깁니다.
                index={expanded ? Math.max(0, index - INITIAL_VISIBLE) : index}
              />
            ))
          ) : (
            <p className="py-12 text-center text-sm text-ink-faint">
              검색 결과가 없습니다. 다른 키워드로 시도해보세요.
            </p>
          )}
        </div>

        {collapsible && (
          <div className="mt-6 flex justify-center">
            {expanded ? (
              <button
                onClick={handleCollapse}
                className="flex items-center gap-1.5 rounded-full border border-ivory-line px-5 py-2.5 text-sm text-ink-soft transition-colors hover:border-crimson hover:text-crimson"
              >
                질문 접기
                <ChevronUp size={15} strokeWidth={1.75} />
              </button>
            ) : (
              <button
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1.5 rounded-full border border-crimson px-5 py-2.5 text-sm text-crimson transition-colors hover:bg-crimson hover:text-ivory"
              >
                질문 더보기 ({filtered.length - INITIAL_VISIBLE}개 더)
                <ChevronDown size={15} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}

        <p className="mt-6 text-xs leading-relaxed text-ink-faint">
          답변은 고려대학교 공식 페이지를 바탕으로 {FAQ_LAST_VERIFIED}에 확인한
          내용이에요. 제도와 일정은 학기마다 바뀔 수 있으니, 중요한 사항은
          각 답변의 출처와 포털 공지에서 최종 확인해주세요.
        </p>
      </div>
    </section>
  );
}
