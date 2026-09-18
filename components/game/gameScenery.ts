import { GROUND_Y, WORLD_H, WORLD_W } from "./gameConstants";

/**
 * 게임 배경(하늘·별·달·먼 산·바닥) 그리기. 난이도(level)가 오를수록 하늘이
 * 보라 → 붉은 노을 → 짙은 적색으로 바뀌어 "점점 뜨거워지는" 분위기를 줍니다.
 */

interface Palette {
  top: string;
  bottom: string;
  far: string;
  near: string;
  ground: string;
  line: string;
}

const PALETTES: Palette[] = [
  { top: "#100c18", bottom: "#231a33", far: "#1a1426", near: "#150f1f", ground: "#0c0910", line: "#4a3f4d" },
  { top: "#1a0f22", bottom: "#4a2247", far: "#2a1830", near: "#1e1226", ground: "#0f0a12", line: "#6a4a63" },
  { top: "#2a0f1c", bottom: "#7a2a3a", far: "#3d1a28", near: "#2b121d", ground: "#120a0e", line: "#8a4a56" },
  { top: "#3a0d14", bottom: "#a3382c", far: "#4e1a1c", near: "#38100f", ground: "#150908", line: "#b0584a" },
];

const LEVELS_PER_PALETTE = 5;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${m(ar, br)},${m(ag, bg)},${m(ab, bb)})`;
}

function paletteAt(level: number): Palette {
  const pos = Math.min(PALETTES.length - 1, level / LEVELS_PER_PALETTE);
  const i = Math.min(PALETTES.length - 2, Math.floor(pos));
  const t = pos - i;
  const a = PALETTES[i];
  const b = PALETTES[i + 1];
  return {
    top: lerpColor(a.top, b.top, t),
    bottom: lerpColor(a.bottom, b.bottom, t),
    far: lerpColor(a.far, b.far, t),
    near: lerpColor(a.near, b.near, t),
    ground: lerpColor(a.ground, b.ground, t),
    line: lerpColor(a.line, b.line, t),
  };
}

// 별 위치는 고정(결정적)으로 만들어 프레임마다 깜빡이지 않게 합니다.
const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 197) % WORLD_W,
  y: 8 + ((i * 53) % 110),
  size: i % 7 === 0 ? 2 : 1,
  twinkle: i % 3,
}));

// 먼 산 실루엣 높이 (반복 타일)
const RIDGE_FAR = [46, 58, 70, 62, 50, 64, 78, 66, 54, 60, 72, 56];
const RIDGE_NEAR = [22, 30, 38, 28, 34, 44, 32, 24];

function drawRidge(
  ctx: CanvasRenderingContext2D,
  heights: number[],
  tile: number,
  offset: number,
  color: string
) {
  ctx.fillStyle = color;
  const total = heights.length * tile;
  const start = -(offset % total);
  for (let base = start; base < WORLD_W + total; base += total) {
    for (let i = 0; i < heights.length; i++) {
      const x = base + i * tile;
      if (x > WORLD_W || x + tile < 0) continue;
      const h = heights[i];
      // 계단식 픽셀 산봉우리
      ctx.fillRect(x, GROUND_Y - h, tile, h);
      ctx.fillRect(x + tile * 0.25, GROUND_Y - h - 6, tile * 0.5, 6);
    }
  }
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  scroll: number,
  level: number,
  time: number
) {
  const p = paletteAt(level);

  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, p.top);
  sky.addColorStop(1, p.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // 별
  for (const s of STARS) {
    const blink = Math.sin(time * 0.002 + s.x) > 0.6 && s.twinkle === 0;
    ctx.fillStyle = blink ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)";
    const x = (((s.x - scroll * 0.03) % WORLD_W) + WORLD_W) % WORLD_W;
    ctx.fillRect(x, s.y, s.size, s.size);
  }

  // 달 (아주 느리게 이동)
  const moonX = WORLD_W - 150 - ((scroll * 0.01) % 40);
  ctx.fillStyle = "rgba(255,243,221,0.9)";
  ctx.fillRect(moonX, 30, 26, 26);
  ctx.fillStyle = "rgba(255,243,221,0.35)";
  ctx.fillRect(moonX - 4, 34, 34, 18);
  ctx.fillRect(moonX + 2, 26, 22, 34);
  ctx.fillStyle = p.bottom;
  ctx.fillRect(moonX + 14, 34, 12, 8);

  // 먼 산 / 가까운 산 (시차 스크롤)
  drawRidge(ctx, RIDGE_FAR, 72, scroll * 0.12, p.far);
  drawRidge(ctx, RIDGE_NEAR, 64, scroll * 0.3, p.near);

  // 바닥
  ctx.fillStyle = p.ground;
  ctx.fillRect(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y);
  ctx.fillStyle = p.line;
  ctx.fillRect(0, GROUND_Y, WORLD_W, 2);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  const offset = scroll % 28;
  for (let x = -28; x < WORLD_W; x += 28) {
    ctx.fillRect(x - offset, GROUND_Y + 8, 12, 2);
  }
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  const offset2 = (scroll * 1.0 + 14) % 44;
  for (let x = -44; x < WORLD_W; x += 44) {
    ctx.fillRect(x - offset2, GROUND_Y + 22, 6, 2);
  }
  const offset3 = (scroll * 1.0 + 9) % 60;
  for (let x = -60; x < WORLD_W; x += 60) {
    ctx.fillRect(x - offset3, GROUND_Y + 38, 18, 2);
  }
}
