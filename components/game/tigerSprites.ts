/**
 * 크롬 공룡 게임 스타일의 "픽셀 호랑이" 스프라이트를 캔버스에 그리는 헬퍼.
 * 실제 이미지 파일 대신 rect 조합으로 그려서, 낮은 내부 해상도 + nearest-neighbor
 * 스케일링과 함께 블록(픽셀) 느낌을 만듭니다.
 */

export const TIGER_W = 44;
export const TIGER_H = 34;

export type TigerPose = "run0" | "run1" | "jump" | "hit";

const ORANGE = "#EE8B3C";
const ORANGE_SHADE = "#D66F22";
const STRIPE = "#2B1B12";
const CREAM = "#FFF3DD";
const PINK = "#FF8FA3";
const DARK = "#241A14";

function r(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/**
 * @param left  바운딩 박스 좌상단 x
 * @param top   바운딩 박스 좌상단 y
 * @param pose  run0/run1(달리기 2프레임) · jump(점프) · hit(장애물 충돌)
 */
export function drawTiger(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  pose: TigerPose
) {
  // 꼬리
  r(ctx, left + 0, top + 10, 8, 6, ORANGE);
  r(ctx, left + 0, top + 6, 4, 5, STRIPE);

  // 몸통 + 배 + 줄무늬
  r(ctx, left + 6, top + 12, 22, 14, ORANGE);
  r(ctx, left + 8, top + 21, 14, 5, CREAM);
  r(ctx, left + 10, top + 12, 3, 6, STRIPE);
  r(ctx, left + 16, top + 12, 3, 6, STRIPE);
  r(ctx, left + 22, top + 12, 3, 6, STRIPE);

  // 다리 (run0/run1은 서로 반대 위상, jump/hit은 몸 아래로 모음)
  const frontUp = pose === "run1";
  const backUp = pose === "run0";
  const tucked = pose === "jump" || pose === "hit";

  const backLegH = tucked ? 4 : backUp ? 4 : 8;
  const frontLegH = tucked ? 4 : frontUp ? 4 : 8;
  r(ctx, left + 10, top + 26, 5, backLegH, ORANGE_SHADE);
  r(ctx, left + 29, top + 26, 5, frontLegH, ORANGE_SHADE);

  // 귀
  r(ctx, left + 27, top + 0, 5, 5, ORANGE_SHADE);
  r(ctx, left + 28, top + 1, 2, 2, PINK);
  r(ctx, left + 37, top + 0, 5, 5, ORANGE_SHADE);
  r(ctx, left + 38, top + 1, 2, 2, PINK);

  // 머리
  r(ctx, left + 26, top + 4, 16, 14, ORANGE);
  r(ctx, left + 29, top + 5, 2, 4, STRIPE);
  r(ctx, left + 34, top + 5, 2, 4, STRIPE);
  r(ctx, left + 33, top + 10, 8, 7, CREAM); // 볼(주둥이)
  r(ctx, left + 39, top + 12, 3, 3, PINK); // 코

  if (pose === "hit") {
    // 충돌 시 눈 대신 X 표시
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left + 35, top + 8);
    ctx.lineTo(left + 38, top + 11);
    ctx.moveTo(left + 38, top + 8);
    ctx.lineTo(left + 35, top + 11);
    ctx.stroke();
  } else {
    r(ctx, left + 36, top + 8, 3, 3, DARK);
  }
}

export type ObstacleKind = "ground" | "bird";

export interface ObstacleSpec {
  kind: ObstacleKind;
  width: number;
  height: number;
  stalks: number;
  color: string;
  /** kind === "bird"일 때, 서 있는 호랑이 머리 기준으로 얼마나 위에서 나는지 */
  flyOffset: number;
  /** 지상 장애물보다 빠르게/느리게 접근하는 배율 (새는 실제로 "날아오는" 느낌을 주기 위해 더 빠릅니다) */
  speedMul: number;
}

const OBSTACLE_COLORS = ["#B33A52", "#3F6B4A", "#B08D57"];
const BIRD_COLOR = "#C9BFE0";

export function randomObstacleSpec(): ObstacleSpec {
  if (Math.random() < 0.25) {
    return {
      kind: "bird",
      width: 24,
      height: 14,
      stalks: 0,
      color: BIRD_COLOR,
      // 서 있는 호랑이 머리 바로 위 ~ 등 높이 정도로 낮게 날아서, 점프로 확실히 넘길 수 있게 합니다.
      flyOffset: 2 + Math.random() * 6,
      speedMul: 1.35,
    };
  }

  const stalks = 1 + Math.floor(Math.random() * 2); // 1~2 (너무 촘촘하지 않도록)
  const height = 22 + Math.floor(Math.random() * 3) * 6; // 22/28/34
  const color = OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)];
  return {
    kind: "ground",
    width: stalks * 8 + (stalks - 1) * 3,
    height,
    stalks,
    color,
    flyOffset: 0,
    speedMul: 1,
  };
}

/**
 * 대나무 느낌의 지상 장애물을 그립니다. groundY는 장애물이 서 있는 바닥선.
 */
function drawGroundObstacle(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  spec: ObstacleSpec
) {
  for (let i = 0; i < spec.stalks; i++) {
    const sx = x + i * 11;
    const sy = groundY - spec.height;
    r(ctx, sx, sy, 8, spec.height, spec.color);
    // 마디(joint) 표시
    for (let j = sy + 6; j < groundY - 4; j += 8) {
      r(ctx, sx, j, 8, 2, "rgba(0,0,0,0.25)");
    }
    // 잎사귀
    r(ctx, sx - 3, sy + 2, 5, 3, spec.color);
    r(ctx, sx + 6, sy + 6, 5, 3, spec.color);
  }
}

/**
 * 하늘을 나는 새 장애물을 그립니다. top은 새 박스의 좌상단 y, frame은 날개짓 프레임(0/1).
 */
function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  color: string,
  frame: 0 | 1
) {
  r(ctx, x + 7, top + 6, 10, 5, color); // 몸통
  r(ctx, x + 15, top + 5, 5, 5, color); // 머리
  r(ctx, x + 19, top + 7, 3, 2, "#FF8FA3"); // 부리

  if (frame === 0) {
    r(ctx, x + 0, top + 2, 9, 3, color);
    r(ctx, x + 15, top + 2, 9, 3, color);
  } else {
    r(ctx, x + 0, top + 9, 9, 3, color);
    r(ctx, x + 15, top + 9, 9, 3, color);
  }
}

/** 새가 날아오는 동안 살짝 위아래로 흔들리는 느낌을 주기 위한 보정값(위치 x 기반, 결정적) */
function birdBob(x: number): number {
  return Math.sin(x * 0.05) * 3;
}

function birdTop(spec: ObstacleSpec, x: number, flyBaseY: number): number {
  return flyBaseY - spec.flyOffset + birdBob(x);
}

/**
 * 장애물을 그립니다. groundY는 바닥선, flyBaseY는 새가 기준으로 삼는 높이(서 있는 호랑이 머리 위).
 */
export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  flyBaseY: number,
  spec: ObstacleSpec,
  wingFrame: 0 | 1
) {
  if (spec.kind === "bird") {
    drawBird(ctx, x, birdTop(spec, x, flyBaseY), spec.color, wingFrame);
    return;
  }
  drawGroundObstacle(ctx, x, groundY, spec);
}

export function obstacleBox(
  obstacle: ObstacleSpec & { x: number },
  groundY: number,
  flyBaseY: number
): { x: number; y: number; w: number; h: number } {
  if (obstacle.kind === "bird") {
    return {
      x: obstacle.x + 2,
      y: birdTop(obstacle, obstacle.x, flyBaseY),
      w: obstacle.width - 4,
      h: obstacle.height,
    };
  }
  return {
    x: obstacle.x + 2,
    y: groundY - obstacle.height,
    w: obstacle.width - 4,
    h: obstacle.height,
  };
}
