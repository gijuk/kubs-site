import ShooterGame from "./ShooterGame";
import GlassShape from "@/components/common/GlassShape";

export default function ShooterGameSection() {
  return (
    <section
      id="shooter"
      className="relative overflow-hidden border-t border-ivory-line bg-ivory px-6 py-24 md:px-10"
    >
      <GlassShape variant="blob" size={200} className="-right-16 top-10 hidden md:block" />
      <GlassShape
        variant="diamond"
        size={90}
        className="left-10 bottom-16 hidden md:block"
        spin
      />

      <div className="relative z-10 mx-auto flex max-w-editorial flex-col items-center gap-6 text-center">
        <div className="reveal flex flex-col items-center gap-4">
          <p className="text-sm text-crimson">미니게임 2</p>
          <h2 className="font-serif text-3xl font-semibold text-ink md:text-4xl">
            KUBS Tiger Shooter
          </h2>
          <p className="max-w-[46ch] text-sm leading-relaxed text-ink-soft">
            호랑이 1마리로 시작해, 좌우로 움직이며 +N 장벽으로 병력을 늘리세요.
            기둥을 부수면 뒤의 몬스터가 한 번에 사라지고, 스테이지 끝에는 보스가 기다립니다.
          </p>
        </div>

        <div
          className="reveal mt-4 w-full"
          style={{ "--reveal-delay": "150ms" } as React.CSSProperties}
        >
          <ShooterGame />
        </div>
      </div>
    </section>
  );
}
