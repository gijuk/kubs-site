import { ArrowLeft } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getAllSchedules } from "@/lib/data/schedules";
import ScheduleFilterList from "@/components/schedule/ScheduleFilterList";

export const revalidate = 60;

export const metadata = {
  title: "전체 일정 · KUBS, IN ONE PLACE",
};

export default async function SchedulePage() {
  const items = await getAllSchedules();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-ivory px-6 pb-24 pt-32 md:px-10 md:pt-40">
        <div className="mx-auto max-w-editorial">
          <a
            href="/#this-week"
            className="flex items-center gap-1.5 text-sm text-ink-faint transition-colors hover:text-crimson"
          >
            <ArrowLeft size={15} strokeWidth={1.75} />
            메인으로
          </a>

          <h1 className="mt-6 font-serif text-3xl font-semibold text-ink md:text-4xl">
            전체 일정
          </h1>
          <p className="mt-2 text-sm text-ink-faint">
            학사 일정, 학생회 사업, 학교 행사를 모두 확인할 수 있습니다.
          </p>

          <div className="mt-10">
            <ScheduleFilterList items={items} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
