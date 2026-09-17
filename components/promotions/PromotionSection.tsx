import { getAllPromotions } from "@/lib/data/promotions";
import PromotionList from "./PromotionList";
import PromotionUploadButton from "./PromotionUploadButton";

export default async function PromotionSection() {
  const promotions = await getAllPromotions();

  return (
    <section
      id="promotions"
      className="border-t border-ivory-line bg-ivory py-24"
    >
      <div className="mx-auto flex max-w-editorial items-end justify-between gap-6 px-6 md:px-10">
        <div>
          <p className="mb-2 text-sm text-crimson">홍보</p>
          <h2 className="font-serif text-3xl font-semibold text-ink md:text-4xl">
            Promotion Board
          </h2>
          <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-ink-faint">
            동아리·행사·일일호프·리크루팅까지, 학생들이 직접 올리는 홍보
            게시판입니다.
          </p>
        </div>

        <PromotionUploadButton className="hidden shrink-0 items-center gap-2 rounded-full bg-crimson px-5 py-2.5 text-sm text-ivory transition-colors hover:bg-crimson-deep sm:flex" />
      </div>

      <div className="mx-auto mt-10 max-w-editorial px-6 md:px-10">
        <PromotionList promotions={promotions} />
      </div>

      <div className="mx-auto mt-8 max-w-editorial px-6 sm:hidden md:px-10">
        <PromotionUploadButton className="flex w-full items-center justify-center gap-2 rounded-full bg-crimson px-5 py-3 text-sm text-ivory" />
      </div>
    </section>
  );
}
