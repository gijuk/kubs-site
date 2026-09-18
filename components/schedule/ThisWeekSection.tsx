import { ArrowUpRight } from "lucide-react";
import { getUpcomingSchedules } from "@/lib/data/schedules";
import ScheduleList from "./ScheduleList";
import GlassShape from "@/components/common/GlassShape";

export default async function ThisWeekSection() {
  const upcoming = await getUpcomingSchedules(5);

  return (
    <section
      id="this-week"
      className="relative overflow-hidden border-t border-ivory-line bg-ivory px-6 py-24 md:px-10"
    >
      <GlassShape
        variant="circle"
        size={200}
        className="-left-16 top-10 hidden md:block"
      />
      <GlassShape
        variant="hex"
        size={110}
        className="right-6 top-1/2 hidden md:block"
        spin
      />

      <div className="relative z-10 mx-auto max-w-editorial">
        <div className="reveal flex items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-sm text-crimson">일정</p>
            <h2 className="font-serif text-3xl font-semibold text-ink md:text-4xl">
              This Week
            </h2>
          </div>
          <a
            href="/schedule"
            className="flex shrink-0 items-center gap-1 text-sm text-ink-soft transition-colors hover:text-crimson"
          >
            전체 일정 보기
            <ArrowUpRight size={15} strokeWidth={1.75} />
          </a>
        </div>

        <div className="mt-10 md:mt-14">
          <ScheduleList items={upcoming} />
        </div>
      </div>
    </section>
  );
}
