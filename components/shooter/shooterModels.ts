/**
 * 캐릭터/몬스터 "키트": 외부 3D 모델 없이 기본 도형(구/박스/원뿔/원기둥)을 부위별로 조합한 설계도입니다.
 * 좌표는 개체 크기(k)를 1로 봤을 때의 상대값이고, 렌더러가 부위마다 InstancedMesh 하나를 만들어
 * 많은 개체를 적은 draw call로 그립니다.
 *
 * 몬스터는 +z(카메라·병력 쪽)를 바라보고, 호랑이는 -z(적 쪽)를 바라봅니다.
 */

export type GeoName = "sphere" | "box" | "cone" | "cyl";

export interface Part {
  g: GeoName;
  /** 색상 (0xRRGGBB) */
  c: number;
  /** 위치 [x, y, z] */
  p: [number, number, number];
  /** 크기 [x, y, z] */
  s: [number, number, number];
  rx?: number;
  rz?: number;
  /** 걷기 흔들림 진폭 (다리·팔). 좌우 위상은 ph 로 반대로 */
  swing?: number;
  ph?: number;
  /** 좌우로 살랑거리는 정도 (꼬리, 스카프) */
  wag?: number;
  /** 조명 영향 없이 스스로 빛남 (눈, 총구) */
  glow?: boolean;
  /** 피격 시 하얗게 번쩍여도 색을 유지 (눈, 이빨, 입) */
  keep?: boolean;
}

const PI = Math.PI;

/** 좌우 대칭 부위 한 쌍을 만들어 줍니다 (x 부호와 rz 반전, 다리·팔은 위상 반대) */
function pair(
  base: Omit<Part, "p"> & { p: [number, number, number] },
  opts: { mirrorRz?: boolean; swingOpposite?: boolean } = {}
): Part[] {
  const left: Part = { ...base, p: [-Math.abs(base.p[0]), base.p[1], base.p[2]] };
  const right: Part = { ...base, p: [Math.abs(base.p[0]), base.p[1], base.p[2]] };
  if (opts.mirrorRz && base.rz !== undefined) {
    left.rz = Math.abs(base.rz);
    right.rz = -Math.abs(base.rz);
  }
  if (opts.swingOpposite) {
    left.ph = 0;
    right.ph = PI;
  }
  return [left, right];
}

// ───────────────────────── 호랑이 (병력) ─────────────────────────
const O = 0xff9a3c;
const OD = 0xe57a1f;
const DK = 0x2b1b12;
const CREAM = 0xfff1d6;
const CRIMSON = 0x9e1b32; // 고려대 크림슨 스카프
const GUN = 0x3b4252;

export const TIGER_KIT: Part[] = [
  { g: "sphere", c: O, p: [0, 0.5, 0], s: [0.36, 0.4, 0.34] }, // 몸통
  { g: "sphere", c: O, p: [0, 1.02, -0.04], s: [0.31, 0.29, 0.28] }, // 머리
  ...pair({ g: "sphere", c: CREAM, p: [0.29, 0.93, -0.04], s: [0.1, 0.1, 0.1] }), // 볼 털
  ...pair({ g: "sphere", c: O, p: [0.22, 1.27, 0], s: [0.1, 0.1, 0.06] }), // 귀
  // 머리 뒤 줄무늬
  { g: "box", c: DK, p: [0, 1.22, 0.14], s: [0.05, 0.14, 0.03] },
  ...pair({ g: "box", c: DK, p: [0.13, 1.17, 0.17], s: [0.04, 0.12, 0.03], rz: 0.5 }, { mirrorRz: true }),
  // 등 줄무늬
  { g: "box", c: DK, p: [0, 0.78, 0.15], s: [0.38, 0.05, 0.06] },
  { g: "box", c: DK, p: [0, 0.62, 0.27], s: [0.4, 0.05, 0.06] },
  { g: "box", c: DK, p: [0, 0.46, 0.32], s: [0.38, 0.05, 0.06] },
  // 크림슨 스카프(목도리) + 휘날리는 끝자락
  { g: "box", c: CRIMSON, p: [0, 0.83, 0.05], s: [0.3, 0.075, 0.26] },
  { g: "box", c: CRIMSON, p: [0.06, 0.72, 0.4], s: [0.09, 0.05, 0.3], wag: 0.07, ph: 0.5 },
  // 꼬리 (살랑살랑) + 끝은 검정
  { g: "cyl", c: O, p: [0, 0.34, 0.44], s: [0.06, 0.26, 0.06], rx: 1.0, wag: 0.03 },
  { g: "cyl", c: O, p: [0, 0.6, 0.68], s: [0.06, 0.22, 0.06], rx: 0.5, wag: 0.06, ph: 0.4 },
  { g: "sphere", c: DK, p: [0, 0.78, 0.78], s: [0.085, 0.085, 0.085], wag: 0.09, ph: 0.8 },
  // 팔 + 총
  ...pair({ g: "box", c: O, p: [0.34, 0.62, -0.16], s: [0.085, 0.09, 0.3] }),
  { g: "box", c: GUN, p: [0.1, 0.63, -0.5], s: [0.1, 0.12, 0.5] },
  { g: "box", c: GUN, p: [0.1, 0.55, -0.32], s: [0.08, 0.14, 0.12] },
  { g: "sphere", c: 0x7df9ff, p: [0.1, 0.63, -0.78], s: [0.06, 0.06, 0.06], glow: true, keep: true },
  // 다리(달릴 때 번갈아 움직임)
  ...pair({ g: "box", c: OD, p: [0.16, 0.14, 0.02], s: [0.11, 0.16, 0.13], swing: 0.6 }, { swingOpposite: true }),
];

// ───────────────────────── 몬스터 1: 고블린 병사 (mob) ─────────────────────────
const GREEN = 0x5aa84a;
const GREEN_L = 0x6dbb55;
const GREEN_D = 0x3f7a35;
const BONE = 0xe6dcc0;
const RED_EYE = 0xff2a2a;
const LEATHER = 0x6b4a2b;

export const GRUNT_KIT: Part[] = [
  { g: "sphere", c: GREEN, p: [0, 0.9, 0], s: [0.85, 0.85, 0.7] }, // 몸통
  { g: "box", c: LEATHER, p: [0, 0.85, 0.55], s: [0.55, 0.5, 0.1] }, // 가죽 가슴받이
  { g: "sphere", c: GREEN_L, p: [0, 1.85, 0.05], s: [0.68, 0.62, 0.6] }, // 머리
  { g: "box", c: 0x2b0f10, p: [0, 1.62, 0.55], s: [0.42, 0.1, 0.1], keep: true }, // 입
  ...pair({ g: "cone", c: 0xffffff, p: [0.14, 1.55, 0.62], s: [0.07, 0.2, 0.07], rx: PI, keep: true }), // 송곳니
  ...pair({ g: "sphere", c: RED_EYE, p: [0.26, 1.98, 0.5], s: [0.15, 0.17, 0.1], glow: true, keep: true }), // 붉은 눈
  ...pair({ g: "box", c: 0x1f2a1a, p: [0.26, 2.12, 0.52], s: [0.2, 0.05, 0.07], rz: 0.35 }, { mirrorRz: true }), // 화난 눈썹
  ...pair({ g: "cone", c: GREEN, p: [0.78, 1.95, 0], s: [0.16, 0.5, 0.14], rz: 1.25 }, { mirrorRz: true }), // 뾰족 귀
  ...pair({ g: "cone", c: BONE, p: [0.28, 2.4, 0], s: [0.1, 0.34, 0.1] }), // 뼈 뿔
  ...pair({ g: "cone", c: 0x3a2a1a, p: [0.85, 1.5, 0], s: [0.14, 0.3, 0.14], rz: 0.8 }, { mirrorRz: true }), // 어깨 가시
  ...pair({ g: "box", c: GREEN, p: [0.98, 0.9, 0.28], s: [0.17, 0.55, 0.17], rx: -0.8, swing: 0.5 }, { swingOpposite: true }), // 팔
  ...pair({ g: "cone", c: BONE, p: [0.98, 0.62, 0.68], s: [0.08, 0.24, 0.08], rx: PI / 2, swing: 0.5 }, { swingOpposite: true }), // 발톱
  ...pair({ g: "box", c: GREEN_D, p: [0.32, 0.3, 0], s: [0.24, 0.6, 0.26], swing: 0.7 }, { swingOpposite: true }), // 다리
  { g: "box", c: 0x7a2a2a, p: [0, 0.5, 0.35], s: [0.5, 0.3, 0.06] }, // 허리 천
  { g: "box", c: 0x7a5a3a, p: [1.15, 1.15, 0.5], s: [0.14, 0.7, 0.14], rz: -0.3 }, // 몽둥이
];

// ───────────────────────── 몬스터 2: 칼날 늑대쥐 (runner) ─────────────────────────
const AMBER = 0xf29a2e;
const AMBER_L = 0xf5b04a;
const AMBER_D = 0xc77a1f;

export const RUNNER_KIT: Part[] = [
  { g: "sphere", c: AMBER, p: [0, 0.65, 0.05], s: [0.6, 0.55, 1.0] }, // 몸(앞으로 기울어 달리는 자세)
  { g: "sphere", c: AMBER_L, p: [0, 0.95, 0.85], s: [0.5, 0.45, 0.5] }, // 머리
  { g: "box", c: AMBER_L, p: [0, 0.85, 1.2], s: [0.28, 0.2, 0.3] }, // 주둥이
  ...pair({ g: "cone", c: 0xffffff, p: [0.1, 0.72, 1.32], s: [0.05, 0.18, 0.05], rx: PI, keep: true }), // 송곳니
  ...pair({ g: "sphere", c: RED_EYE, p: [0.22, 1.05, 1.1], s: [0.11, 0.12, 0.09], glow: true, keep: true }), // 눈
  ...pair({ g: "cone", c: AMBER, p: [0.28, 1.35, 0.8], s: [0.11, 0.34, 0.1], rz: 0.3 }, { mirrorRz: true }), // 귀
  { g: "cone", c: 0x3a1a0a, p: [0, 1.05, 0.35], s: [0.09, 0.3, 0.09] }, // 등 가시 4개
  { g: "cone", c: 0x3a1a0a, p: [0, 1.05, 0.0], s: [0.09, 0.3, 0.09] },
  { g: "cone", c: 0x3a1a0a, p: [0, 1.0, -0.35], s: [0.09, 0.28, 0.09] },
  { g: "cone", c: 0x3a1a0a, p: [0, 0.95, -0.7], s: [0.08, 0.24, 0.08] },
  { g: "cone", c: AMBER_D, p: [0, 0.55, -1.0], s: [0.08, 0.6, 0.08], rx: -1.3, wag: 0.05 }, // 꼬리
  ...pair({ g: "box", c: AMBER_D, p: [0.3, 0.25, 0.5], s: [0.12, 0.5, 0.14], swing: 1.0 }, { swingOpposite: true }), // 앞다리
  ...pair({ g: "box", c: AMBER_D, p: [0.3, 0.25, -0.4], s: [0.12, 0.5, 0.14], swing: 1.0 }, { swingOpposite: true }), // 뒷다리
];

// ───────────────────────── 몬스터 3: 뿔 투구 오우거 (elite) ─────────────────────────
const RED = 0xa82f3a;
const RED_L = 0xc0434d;
const RED_D = 0x7a1f28;
const IRON = 0x3b3340;

export const BRUTE_KIT: Part[] = [
  { g: "sphere", c: RED, p: [0, 0.95, 0], s: [0.95, 0.9, 0.75] }, // 몸통
  { g: "box", c: IRON, p: [0, 1.0, 0.62], s: [0.7, 0.55, 0.12] }, // 가슴 갑옷
  { g: "cone", c: BONE, p: [-0.3, 1.15, 0.72], s: [0.08, 0.22, 0.08], rx: PI / 2 }, // 갑옷 가시
  { g: "cone", c: BONE, p: [0, 1.15, 0.72], s: [0.08, 0.22, 0.08], rx: PI / 2 },
  { g: "cone", c: BONE, p: [0.3, 1.15, 0.72], s: [0.08, 0.22, 0.08], rx: PI / 2 },
  { g: "sphere", c: RED_L, p: [0, 1.95, 0.05], s: [0.5, 0.46, 0.46] }, // 머리
  { g: "sphere", c: IRON, p: [0, 2.15, 0], s: [0.55, 0.34, 0.5] }, // 투구
  ...pair({ g: "cone", c: 0xf0e6cc, p: [0.62, 2.35, 0], s: [0.14, 0.62, 0.14], rz: 0.75 }, { mirrorRz: true }), // 큰 뿔
  ...pair({ g: "sphere", c: 0xffd43a, p: [0.2, 2.0, 0.42], s: [0.12, 0.1, 0.09], glow: true, keep: true }), // 눈
  { g: "box", c: 0x2b0f10, p: [0, 1.75, 0.45], s: [0.36, 0.09, 0.08], keep: true }, // 입
  ...pair({ g: "cone", c: 0xf0e6cc, p: [0.22, 1.68, 0.5], s: [0.07, 0.28, 0.07], keep: true }), // 엄니
  ...pair({ g: "sphere", c: IRON, p: [1.0, 1.45, 0], s: [0.35, 0.3, 0.35] }), // 어깨 보호대
  ...pair({ g: "cone", c: 0xd9d3c0, p: [1.05, 1.75, 0], s: [0.16, 0.5, 0.16], rz: 0.9 }, { mirrorRz: true }), // 어깨 뿔
  ...pair({ g: "box", c: RED, p: [1.15, 0.85, 0.2], s: [0.28, 0.7, 0.28], swing: 0.35 }, { swingOpposite: true }), // 팔
  ...pair({ g: "sphere", c: RED_D, p: [1.15, 0.4, 0.4], s: [0.34, 0.34, 0.34], swing: 0.35 }, { swingOpposite: true }), // 주먹
  ...pair({ g: "box", c: RED_D, p: [0.4, 0.32, 0], s: [0.34, 0.65, 0.36], swing: 0.5 }, { swingOpposite: true }), // 다리
  { g: "box", c: IRON, p: [0, 0.55, 0.4], s: [0.8, 0.14, 0.5] }, // 허리띠
];

// ───────────────────────── 몬스터 4: 독침 두꺼비 (spitter, 원거리) ─────────────────────────
const PURPLE = 0x7d52c4;
const PURPLE_L = 0x8b62d6;
const PURPLE_D = 0x5f3fa0;
const ACID = 0x7dff4a;

export const SPITTER_KIT: Part[] = [
  { g: "sphere", c: PURPLE, p: [0, 0.75, 0], s: [0.9, 0.75, 0.8] }, // 몸
  { g: "sphere", c: 0xb99be6, p: [0, 0.6, 0.45], s: [0.55, 0.45, 0.35] }, // 배
  { g: "sphere", c: PURPLE_L, p: [0, 1.15, 0.55], s: [0.6, 0.45, 0.5] }, // 머리
  { g: "sphere", c: ACID, p: [0, 1.05, 0.95], s: [0.32, 0.25, 0.12], glow: true, keep: true }, // 산성 입
  ...pair({ g: "cyl", c: PURPLE, p: [0.4, 1.65, 0.35], s: [0.07, 0.32, 0.07] }), // 눈 자루
  ...pair({ g: "sphere", c: 0xffffff, p: [0.4, 1.98, 0.38], s: [0.16, 0.16, 0.16], keep: true }), // 눈알
  ...pair({ g: "sphere", c: RED_EYE, p: [0.4, 1.98, 0.52], s: [0.08, 0.08, 0.08], glow: true, keep: true }), // 눈동자
  { g: "cone", c: 0x3d2a6a, p: [0, 1.5, -0.1], s: [0.1, 0.35, 0.1], rx: -0.4 }, // 등 가시
  { g: "cone", c: 0x3d2a6a, p: [0, 1.35, -0.4], s: [0.1, 0.35, 0.1], rx: -0.6 },
  { g: "cone", c: 0x3d2a6a, p: [0, 1.15, -0.7], s: [0.09, 0.3, 0.09], rx: -0.8 },
  ...pair({ g: "box", c: PURPLE_D, p: [0.5, 0.2, 0.15], s: [0.28, 0.4, 0.3] }), // 다리
];

// ───────────────────────── 보스: 악마왕 ─────────────────────────
const BOSS_RED = 0x8f1d2c;
const BOSS_RED_L = 0xb02a3a;
const GOLD = 0xffd84d;

export const BOSS_KIT: Part[] = [
  { g: "sphere", c: BOSS_RED, p: [0, 1.0, 0], s: [0.95, 0.95, 0.8] }, // 몸통
  { g: "box", c: IRON, p: [0, 0.95, 0.7], s: [0.7, 0.6, 0.12] }, // 배 갑옷
  { g: "box", c: GOLD, p: [0, 1.28, 0.74], s: [0.72, 0.06, 0.06] }, // 금장식
  { g: "sphere", c: BOSS_RED_L, p: [0, 2.1, 0.1], s: [0.6, 0.55, 0.55] }, // 머리
  ...pair({ g: "cone", c: 0xf0e6cc, p: [0.55, 2.75, 0], s: [0.16, 0.8, 0.16], rz: 0.5 }, { mirrorRz: true }), // 큰 뿔
  { g: "cone", c: GOLD, p: [0, 2.85, 0], s: [0.1, 0.4, 0.1] }, // 왕관
  { g: "cone", c: GOLD, p: [-0.28, 2.75, 0], s: [0.09, 0.32, 0.09], rz: 0.25 },
  { g: "cone", c: GOLD, p: [0.28, 2.75, 0], s: [0.09, 0.32, 0.09], rz: -0.25 },
  ...pair({ g: "sphere", c: 0xffe14a, p: [0.24, 2.2, 0.5], s: [0.14, 0.11, 0.1], glow: true, keep: true }), // 눈
  { g: "box", c: 0x2b0f10, p: [0, 1.9, 0.52], s: [0.42, 0.1, 0.09], keep: true }, // 입
  ...pair({ g: "cone", c: 0xffffff, p: [0.16, 1.82, 0.56], s: [0.07, 0.24, 0.07], rx: PI, keep: true }), // 송곳니
  ...pair({ g: "sphere", c: IRON, p: [1.15, 1.6, 0], s: [0.4, 0.34, 0.4] }), // 어깨 보호대
  ...pair({ g: "cone", c: GOLD, p: [1.2, 2.0, 0], s: [0.15, 0.5, 0.15], rz: 0.6 }, { mirrorRz: true }), // 금 어깨 가시
  ...pair({ g: "box", c: BOSS_RED, p: [1.3, 0.95, 0.2], s: [0.3, 0.8, 0.3], swing: 0.3 }, { swingOpposite: true }), // 팔
  ...pair({ g: "sphere", c: 0x6d1522, p: [1.3, 0.4, 0.4], s: [0.4, 0.4, 0.4], swing: 0.3 }, { swingOpposite: true }), // 주먹
  ...pair({ g: "box", c: 0x6d1522, p: [0.42, 0.35, 0], s: [0.4, 0.7, 0.42], swing: 0.4 }, { swingOpposite: true }), // 다리
  ...pair({ g: "box", c: 0x3a1420, p: [1.6, 1.7, -0.55], s: [1.0, 0.06, 0.9], rz: 0.55 }, { mirrorRz: true }), // 날개
  { g: "box", c: CRIMSON, p: [0, 1.1, -0.66], s: [0.85, 1.0, 0.05] }, // 망토
];
