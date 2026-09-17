import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/hero/HeroSection";
import ThisWeekSection from "@/components/schedule/ThisWeekSection";
import PhotoArchiveSection from "@/components/archive/PhotoArchiveSection";
import PromotionSection from "@/components/promotions/PromotionSection";
import FaqSection from "@/components/faq/FaqSection";
import KubsMapSection from "@/components/map/KubsMapSection";
import KubsHistoryGameSection from "@/components/game/KubsHistoryGameSection";

// 일정 등록/수정 후 최대 60초 이내에 방문자 화면에 반영됩니다.
// (관리자 페이지에서 저장 시에는 즉시 반영되도록 revalidatePath도 함께 호출합니다.)
export const revalidate = 60;


export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ThisWeekSection />
        <PhotoArchiveSection />
        <PromotionSection />
        <FaqSection />
        <KubsMapSection />
        <KubsHistoryGameSection />
      </main>
      <Footer />
    </>
  );
}
