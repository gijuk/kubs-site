import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: "#FBF9F4",
          soft: "#F5F1E9",
          line: "#E6E0D3",
        },
        ink: {
          DEFAULT: "#1D1B18",
          soft: "#514C43",
          faint: "#8B8477",
        },
        crimson: {
          DEFAULT: "#7A0C2E",
          deep: "#590820",
          bright: "#A6203F",
          tint: "#F3E3E1",
        },
      },
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
