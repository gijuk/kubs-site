import { getAllPhotos } from "@/lib/data/photos";
import PhotoMarquee from "./PhotoMarquee";
import PhotoUploadButton from "./PhotoUploadButton";

export default async function PhotoArchiveSection() {
  const photos = await getAllPhotos();

  return (
    <section
      id="archive"
      className="border-t border-ivory-line bg-ivory-soft py-24"
    >
      <div className="reveal mx-auto flex max-w-editorial items-end justify-between gap-6 px-6 md:px-10">
        <div>
          <p className="mb-2 text-sm text-crimson">기록</p>
          <h2 className="font-serif text-3xl font-semibold text-ink md:text-4xl">
            Photo Archive
          </h2>
          <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-ink-faint">
            학생들이 직접 촬영한 경영대학의 순간들입니다. 마우스를 올리면
            촬영 정보를 확인할 수 있어요.
          </p>
        </div>

        <PhotoUploadButton className="hidden shrink-0 items-center gap-2 rounded-full bg-crimson px-5 py-2.5 text-sm text-ivory transition-colors hover:bg-crimson-deep sm:flex" />
      </div>

      <div className="mt-10">
        <PhotoMarquee photos={photos} />
      </div>

      <div className="mx-auto mt-8 max-w-editorial px-6 sm:hidden md:px-10">
        <PhotoUploadButton className="flex w-full items-center justify-center gap-2 rounded-full bg-crimson px-5 py-3 text-sm text-ivory" />
      </div>
    </section>
  );
}
