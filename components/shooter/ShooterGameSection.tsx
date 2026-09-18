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
            자동으로 달리고 쏘는 호랑이를 좌우로 움직여 몰려오는 몬스터를 물리쳐 보세요.
            처치할수록 레벨이 오르고 총알이 늘어납니다.
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
