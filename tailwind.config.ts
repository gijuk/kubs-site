import type { Config } from "tailwindcss";

// 다크모드 토글에 반응하는 색상은 CSS 변수(globals.css의 :root / .dark)에서
// "R G B" 형식으로 정의하고, 여기서는 그 변수를 읽어 rgb()/opacity로 변환합니다.
// 이렇게 하면 bg-ivory, text-ink 같은 기존 클래스가 코드 수정 없이 다크모드에서
// 자동으로 반전됩니다.
function withOpacity(variableName: string) {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variableName}))`;
    }
    return `rgb(var(${variableName}) / ${opacityValue})`;
  };
}

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Tailwind는 함수 형태의 색상 값(불투명도 대응)을 런타임에 지원하지만
      // 공식 Config 타입 선언에는 없어서, 이 블록만 any로 캐스팅합니다.
      colors: {
        ivory: {
          DEFAULT: withOpacity("--color-ivory"),
          soft: withOpacity("--color-ivory-soft"),
          line: withOpacity("--color-ivory-line"),
          // 다크모드 여부와 무관하게 항상 밝은 고정값 (사진 오버레이, 게임 콘솔 등 전용)
          fixed: "#FBF9F4",
        },
        ink: {
          DEFAULT: withOpacity("--color-ink"),
          soft: withOpacity("--color-ink-soft"),
          faint: withOpacity("--color-ink-faint"),
          // 다크모드 여부와 무관하게 항상 어두운 고정값
          fixed: "#1D1B18",
        },
        crimson: {
          DEFAULT: withOpacity("--color-crimson"),
          deep: withOpacity("--color-crimson-deep"),
          bright: withOpacity("--color-crimson-bright"),
          tint: withOpacity("--color-crimson-tint"),
        },
      } as unknown as Record<string, string>,
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Pretendard", "-apple-system", "sans-serif"],
      },
      maxWidth: {
        editorial: "1180px",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "bounce-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(8px)" },
        },
      },
      animation: {
        marquee: "marquee 42s linear infinite",
        "fade-up": "fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "bounce-slow": "bounce-slow 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
