import type { Photo } from "@/lib/types";

export default function PhotoCard({ photo }: { photo: Photo }) {
  return (
    <div className="group relative h-[280px] w-[220px] shrink-0 overflow-hidden rounded-md bg-ivory-line md:h-[340px] md:w-[260px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={photo.alt}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/85 via-ink/0 to-ink/0 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <p className="text-sm font-medium text-ivory">{photo.eventName}</p>
        <p className="mt-1 text-xs text-ivory/75">
          {photo.date} · {photo.photographer}
        </p>
      </div>
    </div>
  );
}
