import TigerRunnerGame from "./TigerRunnerGame";

export default function KubsHistoryGameSection() {
  return (
    <section className="border-t border-ivory-line bg-ink px-6 py-24 md:px-10">
      <div className="mx-auto flex max-w-editorial flex-col items-center gap-6 text-center">
        <p className="text-sm text-crimson-bright">미니게임</p>
        <h2 className="font-serif text-3xl font-semibold text-ivory md:text-4xl">
          KUBS History Game
        </h2>
        <p className="max-w-[46ch] text-sm leading-relaxed text-ivory/60">
          호랑이와 함께 장애물을 넘으며 고려대 경영대학 120년의 역사를 만나보세요.
        </p>

        <div className="mt-6 flex w-full justify-center">
          <TigerRunnerGame />
        </div>
      </div>
    </section>
  );
}
