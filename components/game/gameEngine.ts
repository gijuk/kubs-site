import {
  TIGER_H,
  TIGER_W,
  makeGroundSpec,
  obstacleBox,
  randomObstacleSpec,
  type ObstacleSpec,
} from "./tigerSprites";
import { GROUND_Y, SPAWN_X, TIGER_X } from "./gameConstants";

/**
 * 게임 규칙(물리, 장애물 생성, 충돌, 난이도)만 담은 엔진입니다. 화면 그리기와 분리되어 있어
 * 시뮬레이션으로 "피할 수 있는 배치인지" 검증할 수 있습니다. 시간은 모두 60fps 기준 "프레임"입니다.
 */

export const GRAVITY = 0.85;
export const JUMP_VELOCITY = -14;
export const BASE_SPEED = 4.4;
export const SPEED_STEP = 0.4;
export const MAX_SPEED = 13.2;
/** 이 레벨까지는 SPEED_STEP씩, 그 이후에는 LATE_SPEED_STEP씩 빨라져 레벨 20 근처에서 최고 속도에 닿습니다 */
const EARLY_LEVELS = 10;
const LATE_SPEED_STEP = 0.48;
export const OBSTACLES_PER_SPEEDUP = 5;
export const OBSTACLES_PER_HISTORY = 10;

/** 일시정지/역사 팝업 후 재개할 때, 가장 가까운 장애물이 최소 이만큼(프레임) 뒤에 도착하도록 보장 */
export const MIN_ARRIVAL_AFTER_RESUME = 60;
const FIRST_OBSTACLE_ARRIVAL = 100;

export const STAND_Y = GROUND_Y - TIGER_H;
export const FLY_BASE_Y = STAND_Y;

export interface Obstacle extends ObstacleSpec {
  x: number;
  counted: boolean;
}

export interface EngineState {
  posY: number;
  velY: number;
  obstacles: Obstacle[];
  speed: number;
  /** 장애물 5개를 넘을 때마다 1씩 오르는 난이도 단계 */
  level: number;
  cleared: number;
  sinceHistory: number;
  nextSpec: ObstacleSpec | null;
  /** nextSpec이 앞 장애물과 "도착 시각" 기준으로 벌어져야 하는 간격(프레임) */
  nextSep: number;
  /** 배경 시차 스크롤용 누적 이동 거리 */
  scroll: number;
  runTimer: number;
  runFrame: 0 | 1;
}

export interface StepEvents {
  collided: boolean;
  landed: boolean;
  speedUp: boolean;
}

export function targetSpeed(level: number): number {
  const early = Math.min(level, EARLY_LEVELS);
  const late = Math.max(0, level - EARLY_LEVELS);
  return Math.min(MAX_SPEED, BASE_SPEED + early * SPEED_STEP + late * LATE_SPEED_STEP);
}

export function createEngine(): EngineState {
  return {
    posY: STAND_Y,
    velY: 0,
    obstacles: [
      {
        ...makeGroundSpec(1, 28),
        x: TIGER_X + FIRST_OBSTACLE_ARRIVAL * BASE_SPEED,
        counted: false,
      },
    ],
    speed: BASE_SPEED,
    level: 0,
    cleared: 0,
    sinceHistory: 0,
    nextSpec: null,
    nextSep: 0,
    scroll: 0,
    runTimer: 0,
    runFrame: 0,
  };
}

export function isGrounded(s: EngineState): boolean {
  return s.posY >= STAND_Y - 1;
}

export function jump(s: EngineState): boolean {
  if (!isGrounded(s)) return false;
  s.velY = JUMP_VELOCITY;
  return true;
}

/** 장애물이 호랑이에게 도착하기까지 남은 프레임 수 */
export function arrivalFrames(o: Obstacle, speed: number): number {
  return (o.x - TIGER_X) / (speed * o.speedMul);
}

/**
 * 다음 장애물과 "앞 장애물이 도착한 뒤 얼마 만에 도착할지"(프레임)를 정합니다.
 * 점프 한 번이 약 33프레임이라, 어떤 난이도에서도 48프레임 밑으로는 내려가지 않게 해서
 * "착지하자마자 다음 장애물이 몸에 닿는" 피할 수 없는 배치를 막습니다.
 * 난이도가 오를수록 간격이 좁아지고, 가끔 좁은 간격이 연달아 나오는 콤보가 섞입니다.
 */
export function pickSeparation(level: number, rand: () => number = Math.random): number {
  const minSep = Math.max(48, 68 - 2.4 * level);
  const maxSep = Math.max(74, 112 - 4 * level);
  const tightChance = Math.min(0.3, 0.05 + 0.03 * level);
  if (rand() < tightChance) return minSep + rand() * 8;
  return minSep + 8 + rand() * Math.max(0, maxSep - minSep - 8);
}

/**
 * 재개 직후 바로 부딪히지 않도록, 앞으로 올 장애물 중 가장 가까운 것이 최소
 * MIN_ARRIVAL_AFTER_RESUME 프레임 뒤에 도착하도록 모든 장애물을 오른쪽으로 밀어줍니다.
 */
export function ensureResumeBuffer(s: EngineState): void {
  let minArrival = Infinity;
  let minMul = 1;
  for (const o of s.obstacles) {
    if (o.counted) continue;
    const a = arrivalFrames(o, s.speed);
    if (a < minArrival) {
      minArrival = a;
      minMul = o.speedMul;
    }
  }
  if (minArrival < MIN_ARRIVAL_AFTER_RESUME) {
    const dx = (MIN_ARRIVAL_AFTER_RESUME - minArrival) * s.speed * minMul;
    for (const o of s.obstacles) o.x += dx;
  }
}

export function step(s: EngineState, dt: number): StepEvents {
  const events: StepEvents = { collided: false, landed: false, speedUp: false };

  // ── 물리 ──
  const wasAirborne = !isGrounded(s);
  s.velY += GRAVITY * dt;
  s.posY += s.velY * dt;
  if (s.posY > STAND_Y) {
    s.posY = STAND_Y;
    s.velY = 0;
  }
  if (wasAirborne && isGrounded(s)) events.landed = true;

  s.runTimer += dt;
  if (s.runTimer > 6) {
    s.runTimer = 0;
    s.runFrame = s.runFrame === 0 ? 1 : 0;
  }

  // 속도는 목표값으로 부드럽게 다가갑니다 (단계가 오를 때 장애물 간격이 갑자기 줄지 않도록)
  s.speed += (targetSpeed(s.level) - s.speed) * Math.min(1, 0.06 * dt);
  s.scroll += s.speed * dt;

  // ── 장애물 생성: "이동 거리"가 아니라 "도착 시각" 간격을 기준으로 ──
  // 새는 지상 장애물보다 빠르게 날아와서, 거리 기준으로 띄우면 앞 장애물을 따라잡아
  // 착지 직후에 닿거나 화면에서 겹칩니다.
  if (!s.nextSpec) {
    s.nextSpec = randomObstacleSpec(s.level);
    s.nextSep = pickSeparation(s.level);
  }
  let lastArrival = -Infinity;
  for (const o of s.obstacles) {
    lastArrival = Math.max(lastArrival, arrivalFrames(o, s.speed));
  }
  const newTravel = (SPAWN_X - TIGER_X) / (s.speed * s.nextSpec.speedMul);
  if (newTravel >= lastArrival + s.nextSep) {
    s.obstacles.push({ ...s.nextSpec, x: SPAWN_X, counted: false });
    s.nextSpec = null;
  }

  // ── 이동, 충돌, 통과 처리 ──
  const tigerBox = {
    x: TIGER_X + 9,
    y: s.posY + 6,
    w: TIGER_W - 18,
    h: TIGER_H - 10,
  };

  for (const o of s.obstacles) {
    o.x -= s.speed * o.speedMul * dt;

    const b = obstacleBox(o, GROUND_Y, FLY_BASE_Y);
    if (
      tigerBox.x < b.x + b.w &&
      tigerBox.x + tigerBox.w > b.x &&
      tigerBox.y < b.y + b.h &&
      tigerBox.y + tigerBox.h > b.y
    ) {
      events.collided = true;
    }

    if (!o.counted && o.x + o.width < TIGER_X) {
      o.counted = true;
      s.cleared += 1;
      s.sinceHistory += 1;
      const level = Math.floor(s.cleared / OBSTACLES_PER_SPEEDUP);
      if (level > s.level) {
        s.level = level;
        events.speedUp = true;
      }
    }
  }
  s.obstacles = s.obstacles.filter((o) => o.x + o.width > -20);

  return events;
}
