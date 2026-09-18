import CampusMapExplorer from "./CampusMapExplorer";
import GlassShape from "@/components/common/GlassShape";

export default function KubsMapSection() {
  return (
    <section
      id="map"
      className="relative overflow-hidden border-t border-ivory-line bg-ivory-soft px-6 py-24 md:px-10"
    >
      <GlassShape
        variant="circle"
        size={220}
        className="-right-20 top-1/3 hidden md:block"
      />
      <GlassShape
        variant="hex"
        size={100}
        className="bottom-16 left-10 hidden md:block"
        spin
      />

      <div className="relative z-10 mx-auto max-w-editorial">
        <div className="reveal">
          <p className="mb-2 text-sm text-crimson">캠퍼스</p>
          <h2 className="font-serif text-3xl font-semibold text-ink md:text-4xl">
            KUBS Map
          </h2>
          <p className="mt-3 max-w-[50ch] text-sm leading-relaxed text-ink-faint">
            경영본관 · LG-POSCO경영관 · 현대자동차경영관, 서로 연결된 세
            건물의 층별 구조를 확인하세요.
          </p>
        </div>

        <div className="reveal mt-10" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          <CampusMapExplorer />
        </div>

        <p className="mt-8 text-xs leading-relaxed text-ink-faint">
          정보 출처: 고려대학교 경영대학 공식 홈페이지, 나무위키. 프린터·소파
          등 세부 편의시설과 정확한 운영시간 정보는 아직 반영되지 않았으며,
          확인되는 대로 업데이트할 예정입니다.
        </p>
      </div>
    </section>
  );
}
