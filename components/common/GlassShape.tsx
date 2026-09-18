"use client";

import { useEffect, useRef, useState } from "react";

type ShapeVariant = "circle" | "hex" | "diamond" | "blob";
type Tone = "crimson" | "ivory";

const CLIP_PATHS: Partial<Record<ShapeVariant, string>> = {
  hex: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  blob: "60% 40% 30% 70% / 50% 60% 40% 50%",
};

const TONE_CLASSES: Record<Tone, string> = {
  crimson:
    "border-crimson/25 bg-gradient-to-br from-crimson/20 via-crimson/5 to-transparent",
  ivory:
    "border-ivory/25 bg-gradient-to-br from-ivory/25 via-ivory/5 to-transparent",
};

interface GlassShapeProps {
  variant?: ShapeVariant;
  tone?: Tone;
  size?: number;
  className?: string;
  /** 도형이 부드럽게 회전하며 떠 있는 느낌을 줄지 여부 */
  spin?: boolean;
}

/**
 * 스크롤에 따라 나타났다 사라지는 유리(glassmorphism) 장식 도형.
 * 순수 장식용이라 pointer-events-none + aria-hidden 처리합니다.
 */
export default function GlassShape({
  variant = "circle",
  tone = "crimson",
  size = 140,
  className = "",
  spin = false,
}: GlassShapeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isRadial = variant === "circle" || variant === "blob";

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute border backdrop-blur-2xl transition-[opacity,transform] duration-[1400ms] ease-out ${
        TONE_CLASSES[tone]
      } ${isRadial ? "rounded-full" : ""} ${
        visible
          ? `scale-100 opacity-100 ${spin ? "animate-[spin_30s_linear_infinite]" : ""}`
          : "scale-50 opacity-0"
      } ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: variant === "blob" ? (CLIP_PATHS.blob as string) : undefined,
        clipPath: variant === "hex" || variant === "diamond" ? CLIP_PATHS[variant] : undefined,
      }}
    />
  );
}
