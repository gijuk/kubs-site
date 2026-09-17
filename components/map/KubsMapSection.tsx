import { MapPin } from "lucide-react";
import { facilities } from "@/lib/mock-data";

/**
 * KUBS Map 섹션
 *
 * 현재는 건물/시설 목록만 표시하는 placeholder 구조입니다.
 * 추후 실제 인터랙티브 지도(예: Kakao Map, Google Maps, 커스텀 SVG 맵)를
 * <MapCanvas /> 자리에 그대로 교체해 넣을 수 있도록 레이아웃만 구성했습니다.
 *
 * 연동 예시:
 *   <MapCanvas facilities={facilities} onSelectFacility={...} />
 */
export default function KubsMapSection() {
  return (
    <section id="map" className="border-t border-ivory-line bg-ivory-soft px-6 py-24 md:px-10">
      <div className="mx-auto max-w-editorial">
        <p className="mb-2 text-sm text-crimson">캠퍼스</p>
        <h2 className="font-serif text-3xl font-semibold text-ink md:text-4xl">
          KUBS Map
        </h2>
        <p className="mt-3 max-w-[50ch] text-sm leading-relaxed text-ink-faint">
          경영대학 건물과 주요 시설을 한눈에 확인하세요. 실제 인터랙티브
          지도는 준비 중입니다.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-[1.3fr_1fr]">
          {/* 지도 캔버스 placeholder — 추후 실제 지도 컴포넌트로 교체 */}
          <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-ivory-line bg-ivory md:aspect-auto">
            <div className="flex flex-col items-center gap-3 text-ink-faint">
              <MapPin size={28} strokeWidth={1.5} />
              <p className="text-sm">인터랙티브 지도 영역 (준비 중)</p>
            </div>
          </div>

          {/* 시설 목록 */}
          <ul className="flex flex-col divide-y divide-ivory-line">
            {facilities.map((facility) => (
              <li key={facility.id} className="flex items-start gap-3 py-4">
                <MapPin
                  size={16}
                  strokeWidth={1.75}
                  className="mt-1 shrink-0 text-crimson"
                />
                <div>
                  <p className="text-sm font-medium text-ink">
                    {facility.name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {facility.building} · {facility.floor}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    {facility.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
