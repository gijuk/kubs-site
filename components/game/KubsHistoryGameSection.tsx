import TigerRunnerGame from "./TigerRunnerGame";
import GlassShape from "@/components/common/GlassShape";

export default function KubsHistoryGameSection() {
  return (
    <section className="relative overflow-hidden border-t border-ivory-line bg-ink px-6 py-24 md:px-10">
      <GlassShape
        tone="ivory"
        variant="blob"
        size={220}
        className="-left-20 top-0 hidden md:block"
      />
      <GlassShape
        tone="ivory"
        variant="diamond"
        size={110}
        className="right-10 bottom-10 hidden md:block"
        spin
      />

      <div className="relative z-10 mx-auto flex max-w-editorial flex-col items-center gap-6 text-center">
        <div className="reveal flex flex-col items-center gap-6">
          <p className="text-sm text-crimson-bright">미니게임</p>
          <h2 className="font-serif text-3xl font-semibold text-ivory md:text-4xl">
            KUBS History Game
          </h2>
          <p className="max-w-[46ch] text-sm leading-relaxed text-ivory/60">
            호랑이와 함께 장애물을 넘으며 고려대 경영대학 120년의 역사를
            만나보세요.
          </p>
        </div>

        <div
          className="reveal mt-6 flex w-full justify-center"
          style={{ "--reveal-delay": "150ms" } as React.CSSProperties}
        >
          <TigerRunnerGame />
        </div>
      </div>
    </section>
  );
}
