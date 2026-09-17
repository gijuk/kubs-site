import type { Photo } from "@/lib/types";
import PhotoCard from "./PhotoCard";

export default function PhotoMarquee({ photos }: { photos: Photo[] }) {
  // 자연스러운 루프를 위해 배열을 두 번 이어붙입니다.
  const looped = [...photos, ...photos];

  return (
    <div className="marquee-track overflow-hidden">
      <div className="marquee-content flex w-max animate-marquee gap-5">
        {looped.map((photo, i) => (
          <PhotoCard key={`${photo.id}-${i}`} photo={photo} />
        ))}
      </div>
    </div>
  );
}
