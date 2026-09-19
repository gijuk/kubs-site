/**
 * 3D 슈팅 러너의 게임 규칙만 담은 엔진입니다. (three.js/DOM을 전혀 모르는 순수 로직)
 * 화면 없이 봇 시뮬레이션으로 밸런스를 검증할 수 있게 렌더링과 분리되어 있습니다.
 *
 * 컨셉: "분대(호랑이 병력)" 러너. 병력 수가 곧 화력이고, 계속 "어디로 갈지"를 고르게 합니다.
 *  - 병력 1명으로 시작. 병력 한 명 한 명이 각자 앞으로 총을 쏩니다.
 *  - 장벽(게이트) +N / -N 을 지나가면 병력이 늘거나 줄어듭니다. (병력은 1명 밑으로 내려가지 않음)
 *  - 선택지: (+N 게이트 vs 몬스터 무리) — 무리를 전멸시키면 보너스, 놓치면 병력이 깎임
 *  - 기둥: HP가 있는 기둥을 부수면 폭발로 뒤에 숨은 몬스터가 한 번에 사라짐
 *  - 스테이지가 끝나면 보스 → 다음 스테이지(끝없이 이어지며 스테이지마다 난이도 상승)
 *
 * 좌표계: x = 좌우(오른쪽 +), z = 앞뒤. 분대장은 z = 0 에 있고, 적/장벽이 -z(먼 곳)에서 +z 로 다가옵니다.
 * 시간은 초, 거리는 월드 단위(m)입니다.
 */

// ── 코스/분대 ──
export const ROAD_HALF_WIDTH = 4.6;
/** 분대장이 갈 수 있는 x 한계 (분대 폭만큼은 안쪽으로 들어와야 함) */
const ROAD_LIMIT = 3.9;
export const SQUAD_START = 1;
export const SQUAD_MAX = 40;
const KEY_SPEED = 11;
const DRAG_FOLLOW = 20;
/** 병력 사이 간격 (캐릭터가 커진 만큼 넓게) */
export const SLOT_DX = 0.82;
export const SLOT_DZ = 0.95;

// ── 사격 ──
/** 병력 한 명이 총알을 쏘는 간격 */
export const FIRE_INTERVAL = 0.25;
export const BULLET_SPEED = 55;
export const BULLET_START_Z = -1.0;
/** 총알 사거리: 이보다 먼 적은 맞힐 수 없어서, 적이 가까이 올 때까지 기다려야 합니다 */
export const BULLET_RANGE = 30;

// ── 스테이지 ──
export const SPAWN_Z = -40;
export const STAGE_LENGTH = 400;
/** 스테이지 끝(보스 직전)에는 일반 인카운터를 더 만들지 않습니다 */
const LAST_SPAWN_MARGIN = 40;
export const BOSS_HOVER_Z = -17;
/** 보스전이 이만큼(초) 길어지면 보스가 돌진해 옵니다 (전투가 무한히 늘어지지 않게) */
const BOSS_ENRAGE_TIME = 60;
const INTERMISSION = 2.6;

export const MAX_LEVEL = 12;

export type EntityKind = "mob" | "runner" | "elite" | "wall" | "pillar" | "boss";

export interface Entity {
  id: number;
  kind: EntityKind;
  x: number;
  z: number;
  /** 가로(x) / 깊이(z) / 높이(y) */
  w: number;
  d: number;
  h: number;
  hp: number;
  maxHp: number;
  flash: number;
  /** 스스로 다가오는 속도 (도로 스크롤 속도에 더해짐) */
  speed: number;
  chase: number;
  seed: number;
  /** "이 z에 닿으면 그때부터 돌진" (그전에는 도로와 함께 흘러옴). 없으면 처음부터 돌진 */
  activateZ?: number;
  /** 선택지 무리 번호: 이 무리를 하나도 놓치지 않고 잡으면 보너스 */
  group?: number;
  /** 이 기둥이 지키는 몬스터: 기둥이 부서지면 함께 폭사 */
  guard?: number;
  /** 분대 옆을 스쳐 지나간 적 (더 이상 위협이 아님) */
  passed?: boolean;
  /** 보스 방어막 남은 시간 (이 동안 피해를 받지 않음) */
  shield?: number;
}

export interface Bullet {
  id: number;
  x: number;
  z: number;
  vz: number;
  /** 이 z보다 멀리 가면 사라짐 */
  endZ: number;
}

/** 보스가 쏘는 투사체 (총알로 격추할 수 있음) */
export interface Shot {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
}

/** 도로 위 장벽. left/right 가 null 이면 그쪽은 뚫려 있음(몬스터 무리가 서 있는 쪽) */
export interface Gate {
  id: number;
  z: number;
  left: number | null;
  right: number | null;
  used: boolean;
}

export interface Group {
  id: number;
  alive: number;
  breached: boolean;
  bonus: number;
}

export type ShooterPhase = "ready" | "playing" | "gameover" | "clear";

export type ShooterEvent =
  | { type: "hit"; x: number; z: number; kind: EntityKind }
  | { type: "kill"; x: number; z: number; kind: EntityKind }
  | { type: "hurt"; lost: number; x: number }
  | { type: "gate"; value: number; x: number }
  | { type: "bonus"; value: number; x: number; reason: "clear" | "stage" }
  | { type: "levelUp"; level: number; squad: number }
  | { type: "explode"; x: number; z: number; radius: number }
  | { type: "shieldOn" }
  | { type: "stageStart"; stage: number }
  | { type: "stageClear"; stage: number }
  | { type: "gameOver"; reason: EntityKind | "shot" };

interface BossState {
  shotCd: number;
  summonCd: number;
  shieldCd: number;
  age: number;
}

export interface ShooterState {
  phase: ShooterPhase;
  time: number;
  /** 지금까지 달린 총 거리 (배경 스크롤용) */
  distance: number;
  stage: number;
  /** 마지막으로 "STAGE n" 시작을 알린 스테이지 (0이면 아직 없음) */
  announcedStage: number;
  /** 현재 스테이지에서 달린 거리 */
  stageDist: number;
  /** 스테이지 클리어 후 다음 스테이지까지 남은 시간 (0이면 진행 중) */
  intermission: number;
  /** 분대장 x (분대 전체의 중심) */
  player: { x: number };
  input: { moveDir: -1 | 0 | 1; dragTargetX: number | null };
  squad: number;
  /** 병력별 다음 발사까지 남은 시간 (한꺼번에 쏘지 않고 엇갈려 쏘기 위함) */
  fireTimers: number[];
  entities: Entity[];
  gates: Gate[];
  groups: Group[];
  bullets: Bullet[];
  shots: Shot[];
  kills: number;
  level: number;
  exp: number;
  spawnTimer: number;
  encounterIdx: number;
  bossSpawned: boolean;
  boss: BossState;
  nextId: number;
  events: ShooterEvent[];
  rng: () => number;
}

// ── 대형(포메이션) ──

export interface Slot {
  dx: number;
  dz: number;
}

const formationCache = new Map<number, Slot[]>();

function perRow(n: number): number {
  return Math.min(n, 7, Math.max(1, Math.ceil(Math.sqrt(n) * 1.3)));
}

/** 병력 n명이 서는 자리 (분대장 기준 좌우 dx, 뒤쪽 dz). 첫 줄이 맨 앞입니다. */
export function formation(n: number): Slot[] {
  const cached = formationCache.get(n);
  if (cached) return cached;
  const cols = perRow(n);
  const slots: Slot[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    const c = i - row * cols;
    slots.push({ dx: (c - (inRow - 1) / 2) * SLOT_DX, dz: row * SLOT_DZ });
  }
  formationCache.set(n, slots);
  return slots;
}

export function squadHalfWidth(n: number): number {
  return ((perRow(Math.max(1, n)) - 1) / 2) * SLOT_DX + 0.4;
}

// ── 레벨 ──

/** 현재 레벨에서 다음 레벨까지 필요한 EXP (몬스터 1마리 = 1, 정예 = 3) */
export function expToNext(level: number): number {
  return 10 + (level - 1) * 6;
}

// ── 스테이지별 난이도 곡선 (스테이지 번호만으로 자동 상승) ──

export function scrollSpeed(stage: number): number {
  return Math.min(12.5, 9 + 0.3 * (stage - 1));
}
const BOSS_SCROLL_SPEED = 3;

function mobSpeed(stage: number): number {
  return Math.min(8.5, 3.0 + 0.5 * (stage - 1));
}

function spawnGap(stage: number): number {
  return Math.max(1.35, 2.15 - 0.09 * (stage - 1));
}

/** 그 스테이지/진행도에서 "이 정도 병력은 있어야 편하다"고 보는 기준 병력 (1~5 → 3~15 → 5~20 → 10~30 ...) */
export function expectedSquad(stage: number, prog: number): number {
  return 1 + (stage - 1) * MASS_STEP + prog * 3;
}
export const MASS_STEP = 6.5;
/** 병력 1명이 무리 하나를 상대할 때 쓸 수 있는 화력(사거리 안에 머무는 동안의 사격) */
const POWER_PER_SOLDIER = 5.3;

/**
 * 무리 하나의 "총 체력량": 기준 병력이 감당하는 화력의 80% 정도로 잡아서,
 * 스테이지가 오를수록 더 많은 병력을 요구하도록 자동으로 늘어납니다.
 */
function packMass(stage: number, prog: number): number {
  return POWER_PER_SOLDIER * expectedSquad(stage, prog) * 0.8;
}

/** 몬스터 한 마리의 평균 체력 */
function hpAvg(stage: number): number {
  return 1.4 + 0.6 * (stage - 1);
}

function bossHp(stage: number): number {
  return 140 + 110 * stage;
}

function pillarHp(stage: number): number {
  return 10 + 14 * stage;
}

export function createState(rng: () => number = Math.random): ShooterState {
  return {
    phase: "ready",
    time: 0,
    distance: 0,
    stage: 1,
    announcedStage: 0,
    stageDist: 0,
    intermission: 0,
    player: { x: 0 },
    input: { moveDir: 0, dragTargetX: null },
    squad: SQUAD_START,
    fireTimers: Array.from({ length: SQUAD_START }, () => 0.1),
    entities: [],
    gates: [],
    groups: [],
    bullets: [],
    shots: [],
    kills: 0,
    level: 1,
    exp: 0,
    spawnTimer: 1.4,
    encounterIdx: 0,
    bossSpawned: false,
    boss: { shotCd: 2, summonCd: 4, shieldCd: 8, age: 0 },
    nextId: 1,
    events: [],
    rng,
  };
}

export function startGame(s: ShooterState): void {
  const fresh = createState(s.rng);
  Object.assign(s, fresh);
  s.phase = "playing";
}

export function bossAlive(s: ShooterState): boolean {
  return s.entities.some((e) => e.kind === "boss");
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function setSquad(s: ShooterState, n: number): void {
  const next = clamp(n, 0, SQUAD_MAX);
  while (s.fireTimers.length < next) s.fireTimers.push(s.rng() * FIRE_INTERVAL);
  s.fireTimers.length = next;
  s.squad = next;
}

// ── 생성 ──

function pushEntity(s: ShooterState, e: Omit<Entity, "id" | "flash" | "seed">): Entity {
  const entity: Entity = { ...e, id: s.nextId++, flash: 0, seed: s.rng() };
  s.entities.push(entity);
  return entity;
}

function progress(s: ShooterState): number {
  return clamp(s.stageDist / STAGE_LENGTH, 0, 1);
}

function mobHp(s: ShooterState): number {
  return 1 + Math.floor((s.stage - 1) * 0.6 + progress(s) * 0.8) + (s.rng() < 0.25 ? 1 : 0);
}

const MOB_W = 1.25;
const ELITE_W = 2.2;
const RUNNER_W = 1.05;

interface MobOpts {
  chase?: number;
  activateZ?: number;
  group?: number;
  guard?: number;
  stationary?: boolean;
  kind?: "mob" | "runner";
  /** 자체 속도 배율 (게임 첫 무리를 천천히 오게 할 때) */
  speedMul?: number;
  /** 체력을 1로 고정 (게임 첫 무리) */
  hp1?: boolean;
}

function spawnMob(s: ShooterState, x: number, z: number, o: MobOpts = {}): Entity {
  const kind = o.kind ?? "mob";
  const hp = kind === "runner" || o.hp1 ? 1 : mobHp(s);
  const base = mobSpeed(s.stage);
  const speed = o.stationary
    ? 0
    : kind === "runner"
    ? base + 4.5 + s.rng() * 0.8
    : base + s.rng() * 0.7;
  const w = kind === "runner" ? RUNNER_W : MOB_W;
  const mul = o.speedMul ?? 1;
  return pushEntity(s, {
    kind,
    x,
    z,
    w,
    d: w,
    h: w * 1.1,
    hp,
    maxHp: hp,
    speed: speed * mul,
    chase: o.chase ?? (kind === "runner" ? 0.35 : 0.22),
    activateZ: o.activateZ,
    group: o.group,
    guard: o.guard,
  });
}

function spawnElite(s: ShooterState, x: number, z: number): void {
  const hp = 6 + s.stage * 3 + Math.floor(s.rng() * 3);
  pushEntity(s, {
    kind: "elite",
    x,
    z,
    w: ELITE_W,
    d: ELITE_W,
    h: 2.4,
    hp,
    maxHp: hp,
    speed: mobSpeed(s.stage) * 0.55,
    chase: 0.12,
  });
}

function spawnWall(s: ShooterState, x: number, w: number): void {
  const hp = 14 + s.stage * 8 + Math.floor(s.rng() * 6);
  pushEntity(s, { kind: "wall", x, z: SPAWN_Z, w, d: 1.6, h: 2, hp, maxHp: hp, speed: 0, chase: 0 });
}

function spawnBoss(s: ShooterState): void {
  s.bossSpawned = true;
  s.boss = { shotCd: 2.2, summonCd: 5, shieldCd: 8, age: 0 };
  const hp = bossHp(s.stage);
  pushEntity(s, {
    kind: "boss",
    x: 0,
    z: SPAWN_Z - 4,
    w: 4.6,
    d: 3.6,
    h: 4.2,
    hp,
    maxHp: hp,
    speed: 2.4,
    chase: 0,
    shield: 0,
  });
}

/** 몬스터 무리(격자 대형)를 한 덩어리로 만듭니다. (몬스터 수는 스테이지/진행도에 따라 3 → 20+) */
function spawnPack(s: ShooterState, small = false, intro = false): void {
  const st = s.stage;
  let count = Math.round(packMass(st, progress(s)) / hpAvg(st) + (s.rng() * 2 - 1));
  count = clamp(small ? Math.ceil(count * 0.5) : count, 3, 30);
  // 게임을 처음 켠 직후의 첫 무리: 병력 1명이 조작을 익힐 수 있게 2마리, 조금 느리게
  if (intro) count = 2;
  const cols = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(count * 1.7))));
  const rows = Math.ceil(count / cols);
  const spacing = 1.5;
  const width = (cols - 1) * spacing;
  const limit = ROAD_HALF_WIDTH - 0.9 - width / 2;
  const cx = (s.rng() * 2 - 1) * Math.max(0, limit);
  const runnerChance = st >= 2 ? Math.min(0.3, 0.1 + 0.03 * st) : 0;
  let placed = 0;
  for (let r = 0; r < rows && placed < count; r++) {
    for (let c = 0; c < cols && placed < count; c++) {
      const x = cx + (c - (cols - 1) / 2) * spacing + (s.rng() - 0.5) * 0.3;
      const z = SPAWN_Z - 2 - r * 1.6 - s.rng() * 0.4;
      spawnMob(s, x, z, {
        kind: s.rng() < runnerChance ? "runner" : "mob",
        speedMul: intro ? 0.45 : 1,
        hp1: intro,
      });
      placed++;
    }
  }
  if (!small && st >= 2 && s.rng() < 0.3 + 0.03 * st) {
    spawnElite(s, clamp(cx + (s.rng() - 0.5) * 3, -3, 3), SPAWN_Z - 2 - rows * 1.6 - 2);
  }
}

/** 좌우 선택지: 두 장벽 중 하나를 고르는 구조. 병력이 적을 땐 즉사하는 -N은 나오지 않게 합니다. */
function spawnChoice(s: ShooterState): void {
  const st = s.stage;
  const goodMax = Math.min(5, 2 + Math.floor(st / 3));
  const badMax = Math.min(5, 2 + Math.floor(st / 3));
  const good = () => 1 + Math.floor(s.rng() * goodMax);
  const bad = () => -Math.min(1 + Math.floor(s.rng() * badMax), Math.max(1, s.squad - 1));
  const roll = s.rng();
  const canBad = s.squad >= 2;
  let a: number;
  let b: number;
  if (!canBad || roll < 0.25) {
    a = good();
    b = good();
    if (a === b) b = Math.min(goodMax + 1, b + 1);
  } else if (roll < 0.9) {
    a = good();
    b = bad();
  } else {
    a = bad();
    b = -1;
  }
  const flip = s.rng() < 0.5;
  s.gates.push({ id: s.nextId++, z: SPAWN_Z, left: flip ? b : a, right: flip ? a : b, used: false });
}

/**
 * "안전한 +N 게이트 vs 위험하지만 보상이 큰 몬스터 무리".
 * 무리는 옆으로 스쳐 지나갈 수 있지만, 정면으로 받으면 놓친 수만큼 병력이 줄고,
 * 하나도 놓치지 않고 전멸시키면 게이트보다 큰 보너스를 줍니다.
 */
function spawnVersus(s: ShooterState): void {
  const st = s.stage;
  const gateSide = s.rng() < 0.5 ? -1 : 1;
  const g = clamp(2 + Math.floor(s.rng() * (2 + st * 0.35)), 2, 7);
  const bonus = g + 1;
  // 지금 병력이 감당할 수 있는 한계 근처 (무리를 전멸시킬 수 있는지가 곧 "판단")
  const count = clamp(Math.round((s.squad * (4.4 + 0.15 * st)) / hpAvg(st)), 3, 26);

  s.gates.push({
    id: s.nextId++,
    z: SPAWN_Z,
    left: gateSide < 0 ? g : null,
    right: gateSide > 0 ? g : null,
    used: false,
  });

  const groupId = s.nextId++;
  s.groups.push({ id: groupId, alive: count, breached: false, bonus });
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(count))));
  const spacing = 1.5;
  const cx = -gateSide * 2.35;
  let placed = 0;
  for (let r = 0; placed < count; r++) {
    for (let c = 0; c < cols && placed < count; c++) {
      const x = cx + (c - (cols - 1) / 2) * spacing;
      spawnMob(s, x, SPAWN_Z - 1 - r * 1.6, {
        chase: 0,
        activateZ: -24,
        group: groupId,
      });
      placed++;
    }
  }
}

/** 기둥 + 그 뒤에 숨은 대규모 몬스터. 기둥을 빨리 부수면 뒤의 무리가 한 번에 사라집니다. */
function spawnPillar(s: ShooterState): void {
  const st = s.stage;
  const px = (s.rng() * 2 - 1) * 1.9;
  const pillar = pushEntity(s, {
    kind: "pillar",
    x: px,
    z: SPAWN_Z,
    w: 2.4,
    d: 2.4,
    h: 4.2,
    hp: pillarHp(st) + Math.floor(s.rng() * 6),
    maxHp: 0,
    speed: 0,
    chase: 0,
  });
  pillar.maxHp = pillar.hp;

  const count = clamp(Math.round((packMass(st, progress(s)) * 1.15) / hpAvg(st)), 5, 28);
  const cols = 4;
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    spawnMob(s, px + (c - (cols - 1) / 2) * 1.45, SPAWN_Z - 3.2 - r * 1.55, {
      stationary: true,
      chase: 0,
      guard: pillar.id,
    });
  }

  // 기둥을 부수는 동안에도 옆에서 다른 적이 몰려옵니다.
  const side = px > 0 ? -1 : 1;
  const rushers = 2 + Math.floor(st * 0.45);
  for (let i = 0; i < rushers; i++) {
    spawnMob(s, side * (2.7 + (i % 2) * 0.9), SPAWN_Z - 4 - i * 2.2, {
      chase: 0.12,
      kind: st >= 3 && i % 3 === 2 ? "runner" : "mob",
    });
  }
}

/** 스테이지 1은 기둥을 뒤로 미뤄서, 병력이 어느 정도 모인 뒤에 처음 만나게 합니다. */
const PLAN_INTRO = [
  "pack",
  "choice",
  "pack",
  "versus",
  "pack",
  "choice",
  "pack",
  "pillar",
  "versus",
  "pack",
  "choice",
  "pillar",
] as const;

const PLAN = [
  "pack",
  "choice",
  "pack",
  "versus",
  "pack",
  "pillar",
  "choice",
  "pack",
  "versus",
  "pack",
  "pillar",
  "choice",
] as const;

/** 다음 인카운터를 만들고, 그 다음 인카운터까지의 시간(초)을 돌려줍니다. */
function spawnEncounter(s: ShooterState): number {
  const plan = s.stage === 1 ? PLAN_INTRO : PLAN;
  const type = plan[s.encounterIdx++ % plan.length];
  const gap = spawnGap(s.stage);
  switch (type) {
    case "pack":
      const intro = s.encounterIdx === 1 && s.stage === 1;
      spawnPack(s, s.encounterIdx === 1, intro);
      if (s.stage >= 3 && s.rng() < 0.25) {
        const w = 2.6 + s.rng() * 1.2;
        spawnWall(s, (s.rng() * 2 - 1) * (ROAD_LIMIT - w / 2), w);
      }
      return intro ? gap + 1.6 : gap;
    case "choice":
      spawnChoice(s);
      return gap + 0.5;
    case "versus":
      spawnVersus(s);
      return gap + 1.3;
    case "pillar":
      spawnPillar(s);
      return gap + 1.5;
  }
}

// ── 보스 패턴 ──

function fireBossShots(s: ShooterState, boss: Entity): void {
  const n = s.stage >= 6 ? 3 : s.stage >= 3 ? 2 : 1;
  const speed = 15 + Math.min(6, s.stage * 0.6);
  const z0 = boss.z + boss.d / 2;
  const travel = Math.max(0.3, (0 - z0) / speed);
  for (let i = 0; i < n; i++) {
    const aim = s.player.x + (i - (n - 1) / 2) * 1.9;
    s.shots.push({ id: s.nextId++, x: boss.x, z: z0, vx: (aim - boss.x) / travel, vz: speed });
  }
}

function stepBoss(s: ShooterState, boss: Entity, dt: number): void {
  const b = s.boss;
  b.age += dt;
  const enraged = b.age > BOSS_ENRAGE_TIME;

  // 등장 후 정해진 자리까지 다가오고, 그 뒤엔 좌우로 움직이며 공격
  const targetZ = enraged ? 2 : BOSS_HOVER_Z;
  if (boss.z < targetZ) boss.z += (BOSS_SCROLL_SPEED + boss.speed) * dt * (enraged ? 1.4 : 1);
  boss.x = Math.sin(b.age * (0.7 + 0.07 * Math.min(s.stage, 10))) * 2.5;

  if (boss.shield && boss.shield > 0) boss.shield = Math.max(0, boss.shield - dt);

  // 1) 투사체
  b.shotCd -= dt;
  if (b.shotCd <= 0 && boss.z > SPAWN_Z + 6) {
    fireBossShots(s, boss);
    b.shotCd = Math.max(1.1, 2.6 - 0.15 * s.stage);
  }
  // 2) 작은 적 소환 (스테이지 2부터)
  if (s.stage >= 2) {
    b.summonCd -= dt;
    if (b.summonCd <= 0) {
      const n = 3 + Math.floor(s.stage / 2);
      for (let i = 0; i < n; i++) {
        spawnMob(s, boss.x + (i - (n - 1) / 2) * 1.6, boss.z - 1, { chase: 0.2 });
      }
      b.summonCd = Math.max(3.2, 6.5 - 0.3 * s.stage);
    }
  }
  // 3) 방어막 (스테이지 4부터): 잠깐 무적이 되니 그 사이 투사체·소환수를 처리해야 함
  if (s.stage >= 4) {
    b.shieldCd -= dt;
    if (b.shieldCd <= 0) {
      boss.shield = 2 + Math.min(1.5, s.stage * 0.12);
      b.shieldCd = 9;
      s.events.push({ type: "shieldOn" });
    }
  }
}

// ── 스테이지 전환 ──

function beginNextStage(s: ShooterState): void {
  s.stage += 1;
  s.stageDist = 0;
  s.bossSpawned = false;
  s.encounterIdx = 0;
  s.spawnTimer = 1.6;
  s.entities = [];
  s.gates = [];
  s.groups = [];
  s.shots = [];
}

function clearStage(s: ShooterState): void {
  s.events.push({ type: "stageClear", stage: s.stage });
  // 스테이지 클리어 보상: 병력 +1 (다음 스테이지가 더 어려워지므로 작은 회복 기회)
  setSquad(s, s.squad + 1);
  s.events.push({ type: "bonus", value: 1, x: s.player.x, reason: "stage" });
  s.intermission = INTERMISSION;
  // 남은 잔몹/투사체는 정리
  for (const e of s.entities) {
    if (e.kind !== "boss") s.events.push({ type: "kill", x: e.x, z: e.z, kind: e.kind });
  }
  s.entities = [];
  s.shots = [];
}

// ── 한 스텝 ──

function stepOnce(s: ShooterState, dt: number): void {
  s.time += dt;
  if (s.announcedStage !== s.stage) {
    s.announcedStage = s.stage;
    s.events.push({ type: "stageStart", stage: s.stage });
  }
  const boss = s.entities.find((e) => e.kind === "boss");
  const scroll = boss ? BOSS_SCROLL_SPEED : scrollSpeed(s.stage);
  s.distance += scroll * dt;
  if (s.intermission <= 0) s.stageDist += scroll * dt;

  // 분대장 이동 (분대 폭만큼 안쪽까지만)
  const limit = ROAD_LIMIT - (squadHalfWidth(s.squad) - 0.4);
  if (s.input.dragTargetX !== null) {
    const target = clamp(s.input.dragTargetX, -limit, limit);
    s.player.x += (target - s.player.x) * (1 - Math.exp(-DRAG_FOLLOW * dt));
  } else {
    s.player.x += s.input.moveDir * KEY_SPEED * dt;
  }
  s.player.x = clamp(s.player.x, -limit, limit);

  // 병력 각자가 자기 앞으로 직선 사격
  const slots = formation(s.squad);
  for (let i = 0; i < s.squad; i++) {
    s.fireTimers[i] -= dt;
    while (s.fireTimers[i] <= 0) {
      const slot = slots[i];
      const z = BULLET_START_Z + slot.dz;
      s.bullets.push({
        id: s.nextId++,
        x: s.player.x + slot.dx + (s.rng() - 0.5) * 0.06,
        z,
        vz: -BULLET_SPEED,
        endZ: z - BULLET_RANGE,
      });
      s.fireTimers[i] += FIRE_INTERVAL;
    }
  }

  // 인카운터 / 보스 생성, 스테이지 전환
  if (s.intermission > 0) {
    s.intermission -= dt;
    if (s.intermission <= 0) beginNextStage(s);
  } else if (!s.bossSpawned) {
    if (s.stageDist >= STAGE_LENGTH) {
      spawnBoss(s);
    } else if (s.stageDist < STAGE_LENGTH - LAST_SPAWN_MARGIN) {
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) s.spawnTimer += spawnEncounter(s);
    }
  }
  if (boss) stepBoss(s, boss, dt);

  // 보스 투사체 이동 (총알로 격추 가능)
  const liveShots: Shot[] = [];
  for (const sh of s.shots) {
    sh.x += sh.vx * dt;
    sh.z += sh.vz * dt;
    if (sh.z >= -0.3) {
      if (Math.abs(sh.x - s.player.x) < squadHalfWidth(s.squad) + 0.5) {
        setSquad(s, s.squad - 1);
        s.events.push({ type: "hurt", lost: 1, x: sh.x });
      }
      continue;
    }
    liveShots.push(sh);
  }
  s.shots = liveShots;

  // 총알 이동 + 충돌 (가장 먼저 닿는 = z가 가장 큰 대상에 맞음)
  const survivors: Bullet[] = [];
  for (const b of s.bullets) {
    const stepZ = Math.abs(b.vz) * dt;
    b.z += b.vz * dt;

    // 보스 투사체 격추
    let shotDown = false;
    for (let i = 0; i < s.shots.length; i++) {
      const sh = s.shots[i];
      if (Math.abs(sh.x - b.x) < 0.55 && Math.abs(sh.z - b.z) < 0.9 + stepZ * 0.5) {
        s.shots.splice(i, 1);
        s.events.push({ type: "hit", x: sh.x, z: sh.z, kind: "mob" });
        shotDown = true;
        break;
      }
    }
    if (shotDown) continue;

    let hit: Entity | null = null;
    for (const e of s.entities) {
      if (
        Math.abs(b.x - e.x) <= e.w / 2 + 0.08 &&
        b.z <= e.z + e.d / 2 &&
        b.z >= e.z - e.d / 2 - stepZ
      ) {
        if (!hit || e.z > hit.z) hit = e;
      }
    }
    if (hit) {
      if (!(hit.shield && hit.shield > 0)) hit.hp -= 1;
      hit.flash = 0.08;
      s.events.push({ type: "hit", x: b.x, z: hit.z + hit.d / 2, kind: hit.kind });
      continue;
    }
    if (b.z > b.endZ) survivors.push(b);
  }
  s.bullets = survivors;

  // 기둥이 부서지면: 폭발 → 지키던 몬스터와 주변 몬스터가 한꺼번에 사라짐
  for (const p of s.entities) {
    if (p.kind !== "pillar" || p.hp > 0) continue;
    const radius = 7.5;
    for (const e of s.entities) {
      if (e === p || e.hp <= 0) continue;
      if (e.kind === "boss" || e.kind === "wall" || e.kind === "pillar") continue;
      const near = Math.hypot(e.x - p.x, e.z - p.z) < radius;
      if (e.guard === p.id || near) e.hp = 0;
    }
    s.events.push({ type: "explode", x: p.x, z: p.z, radius });
  }

  // 처치 처리
  let bossKilled = false;
  const alive: Entity[] = [];
  for (const e of s.entities) {
    if (e.hp > 0) {
      alive.push(e);
      continue;
    }
    s.events.push({ type: "kill", x: e.x, z: e.z, kind: e.kind });
    if (e.kind === "boss") {
      bossKilled = true;
      s.kills += 1;
      s.exp += 30;
    } else if (e.kind === "elite") {
      s.kills += 1;
      s.exp += 3;
    } else if (e.kind === "pillar") {
      s.exp += 2;
    } else if (e.kind === "mob" || e.kind === "runner") {
      s.kills += 1;
      s.exp += 1;
    }
    if (e.group !== undefined) noteGroupDown(s, e.group, false);
  }
  s.entities = alive;

  while (s.level < MAX_LEVEL && s.exp >= expToNext(s.level)) {
    s.exp -= expToNext(s.level);
    s.level += 1;
    setSquad(s, s.squad + 1); // 레벨업 보상: 병력 +1
    s.events.push({ type: "levelUp", level: s.level, squad: s.squad });
  }
  if (s.level >= MAX_LEVEL) s.exp = 0;

  if (bossKilled) {
    clearStage(s);
    return;
  }

  // 적/장벽 이동 + 분대에 닿았을 때의 피해
  const remaining: Entity[] = [];
  for (const e of s.entities) {
    if (e.kind !== "boss") {
      const awake = e.activateZ === undefined || e.z >= e.activateZ;
      e.z += (scroll + (awake ? e.speed : 0)) * dt;
      if (awake && !e.passed && (e.kind === "mob" || e.kind === "runner" || e.kind === "elite")) {
        e.x += (s.player.x - e.x) * e.chase * dt;
      }
    }
    e.flash = Math.max(0, e.flash - dt);

    if (e.kind === "boss") {
      if (e.z + e.d / 2 >= -0.4) {
        setSquad(s, 0);
        s.events.push({ type: "hurt", lost: SQUAD_MAX, x: s.player.x });
        break;
      }
      remaining.push(e);
      continue;
    }

    const reached = e.z + e.d / 2 >= -0.4;
    if (!reached || e.passed) {
      if (e.passed && e.z - e.d / 2 > 4) continue; // 지나간 적은 정리
      remaining.push(e);
      continue;
    }

    const overlaps = Math.abs(e.x - s.player.x) < e.w / 2 + squadHalfWidth(s.squad) + 0.35;
    if (e.kind === "wall" || e.kind === "pillar") {
      if (overlaps) {
        const lost = Math.min(3, s.squad);
        setSquad(s, s.squad - 3);
        s.events.push({ type: "hurt", lost, x: e.x });
        s.events.push({ type: "kill", x: e.x, z: e.z, kind: e.kind });
        continue; // 부딪혀서 부서짐 (기둥이면 지키던 적은 그대로 몰려옴)
      }
      e.passed = true;
      remaining.push(e);
      continue;
    }

    // 몬스터: 분대와 겹치면 병력을 잃고 사라지고, 옆으로 비껴가면 그냥 지나감
    if (overlaps) {
      const dmg = e.kind === "elite" ? 2 : 1;
      const lost = Math.min(dmg, s.squad);
      setSquad(s, s.squad - dmg);
      s.events.push({ type: "hurt", lost, x: e.x });
      s.events.push({ type: "kill", x: e.x, z: e.z, kind: e.kind });
      if (e.group !== undefined) noteGroupDown(s, e.group, true);
      continue;
    }
    e.passed = true;
    if (e.group !== undefined) noteGroupDown(s, e.group, true);
    remaining.push(e);
  }
  s.entities = remaining;

  // 장벽(게이트): 분대장이 서 있는 쪽의 숫자가 적용됨 (뚫린 쪽은 효과 없음)
  for (const g of s.gates) {
    g.z += scroll * dt;
    if (!g.used && g.z >= -0.4) {
      g.used = true;
      const value = (s.player.x < 0 ? g.left : g.right) ?? 0;
      if (value !== 0) {
        // 게이트만으로는 병력이 1명 밑으로 내려가지 않음 (0명은 몬스터에게 졌을 때만)
        setSquad(s, Math.max(1, s.squad + value));
        s.events.push({ type: "gate", value, x: s.player.x });
      }
    }
  }
  s.gates = s.gates.filter((g) => g.z < 6);

  if (s.squad <= 0) {
    s.phase = "gameover";
    s.events.push({ type: "gameOver", reason: boss ? "boss" : "mob" });
  }
}

/** 선택지 무리의 한 마리가 (처치되어서 / 분대에 닿거나 스쳐서) 사라졌을 때 */
function noteGroupDown(s: ShooterState, id: number, breach: boolean): void {
  const g = s.groups.find((x) => x.id === id);
  if (!g) return;
  g.alive -= 1;
  if (breach) g.breached = true;
  if (g.alive <= 0) {
    if (!g.breached) {
      // 하나도 놓치지 않고 전멸시킴 → 보너스 병력
      setSquad(s, s.squad + g.bonus);
      s.events.push({ type: "bonus", value: g.bonus, x: s.player.x, reason: "clear" });
    }
    s.groups = s.groups.filter((x) => x.id !== id);
  }
}

const FIXED_DT = 1 / 60;
const MAX_STEPS_PER_UPDATE = 6;

/** 실제 경과 시간(초)만큼 게임을 진행합니다. 고정 간격으로 잘게 나눠 계산합니다. */
export function update(s: ShooterState, dtSeconds: number): void {
  s.events = [];
  if (s.phase !== "playing") return;
  let remaining = Math.min(dtSeconds, FIXED_DT * MAX_STEPS_PER_UPDATE);
  while (remaining > 1e-6 && s.phase === "playing") {
    const dt = Math.min(FIXED_DT, remaining);
    stepOnce(s, dt);
    remaining -= dt;
  }
}
