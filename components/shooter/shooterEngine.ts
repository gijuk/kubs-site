/**
 * 3D 슈팅 러너의 게임 규칙만 담은 엔진입니다. (three.js/DOM을 전혀 모르는 순수 로직)
 * 화면 없이 봇 시뮬레이션으로 밸런스를 검증할 수 있게 렌더링과 분리되어 있습니다.
 *
 * 컨셉: "분대(호랑이 병력)" 러너. 병력 수가 곧 화력입니다.
 *  - 병력 한 명 한 명이 각자 앞으로 총을 쏩니다. (병력이 많을수록 총알 줄기가 많아짐)
 *  - 도로 위 장벽(게이트)의 +N / -N 을 지나가면 병력이 늘거나 줄어듭니다.
 *  - 몬스터 무리가 가까운 곳에서 빠르게 몰려오고, 병력에 닿으면 병력이 한 명씩 쓰러집니다.
 *  - 병력이 0명이 되면 게임 오버. 스테이지 끝에는 보스가 나옵니다.
 *
 * 좌표계: x = 좌우(오른쪽 +), z = 앞뒤. 분대장은 z = 0 에 있고, 적/장벽이 -z(먼 곳)에서 +z 로 다가옵니다.
 * 시간은 초, 거리는 월드 단위(m)입니다.
 */

// ── 코스/분대 ──
export const ROAD_HALF_WIDTH = 4.6;
/** 분대장이 갈 수 있는 x 한계 (분대 폭만큼은 안쪽으로 들어와야 함) */
const ROAD_LIMIT = 3.9;
export const SQUAD_START = 3;
export const SQUAD_MAX = 24;
const KEY_SPEED = 11;
const DRAG_FOLLOW = 20;

// ── 사격 ──
/** 병력 한 명이 총알을 쏘는 간격 */
export const FIRE_INTERVAL = 0.25;
export const BULLET_SPEED = 55;
export const BULLET_START_Z = -1.0;
/** 총알 사거리: 이보다 먼 적은 맞힐 수 없어서, 적이 가까이 올 때까지 기다려야 합니다 */
export const BULLET_RANGE = 30;

// ── 스테이지 ──
export const SCROLL_SPEED = 9;
const BOSS_SCROLL_SPEED = 3;
export const STAGE_LENGTH = 700;
export const SECTION_LENGTH = 175;
export const SPAWN_Z = -40;
const LAST_SPAWN_MARGIN = 48;

export const MAX_LEVEL = 12;

export type EntityKind = "mob" | "elite" | "wall" | "boss";

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
}

export interface Bullet {
  id: number;
  x: number;
  z: number;
  vz: number;
  /** 이 z보다 멀리 가면 사라짐 */
  endZ: number;
}

export interface Gate {
  id: number;
  z: number;
  left: number;
  right: number;
  used: boolean;
}

export type ShooterPhase = "ready" | "playing" | "gameover" | "clear";

export type ShooterEvent =
  | { type: "hit"; x: number; z: number; kind: EntityKind }
  | { type: "kill"; x: number; z: number; kind: EntityKind }
  | { type: "hurt"; lost: number; x: number }
  | { type: "gate"; value: number; x: number }
  | { type: "levelUp"; level: number; squad: number }
  | { type: "gameOver"; reason: EntityKind | "gate" }
  | { type: "stageClear" };

export interface ShooterState {
  phase: ShooterPhase;
  time: number;
  distance: number;
  /** 분대장 x (분대 전체의 중심) */
  player: { x: number };
  input: { moveDir: -1 | 0 | 1; dragTargetX: number | null };
  squad: number;
  /** 병력별 다음 발사까지 남은 시간 (한꺼번에 쏘지 않고 엇갈려 쏘기 위함) */
  fireTimers: number[];
  entities: Entity[];
  gates: Gate[];
  bullets: Bullet[];
  kills: number;
  level: number;
  exp: number;
  spawnTimer: number;
  spawnIndex: number;
  bossSpawned: boolean;
  bossMinionTimer: number;
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
  return Math.min(n, 5, Math.max(1, Math.ceil(Math.sqrt(n) * 1.3)));
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
    slots.push({ dx: (c - (inRow - 1) / 2) * 0.62, dz: row * 0.8 });
  }
  formationCache.set(n, slots);
  return slots;
}

export function squadHalfWidth(n: number): number {
  return ((perRow(Math.max(1, n)) - 1) / 2) * 0.62 + 0.3;
}

// ── 레벨 ──

/** 현재 레벨에서 다음 레벨까지 필요한 EXP (몬스터 1마리 = 1, 정예 = 3) */
export function expToNext(level: number): number {
  return 10 + (level - 1) * 6;
}

export function currentSection(distance: number): number {
  return Math.min(3, Math.floor(distance / SECTION_LENGTH));
}

export function createState(rng: () => number = Math.random): ShooterState {
  return {
    phase: "ready",
    time: 0,
    distance: 0,
    player: { x: 0 },
    input: { moveDir: 0, dragTargetX: null },
    squad: SQUAD_START,
    fireTimers: Array.from({ length: SQUAD_START }, (_, i) => (i / SQUAD_START) * FIRE_INTERVAL),
    entities: [],
    gates: [],
    bullets: [],
    kills: 0,
    level: 1,
    exp: 0,
    spawnTimer: 1.0,
    spawnIndex: 0,
    bossSpawned: false,
    bossMinionTimer: 3,
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

function mobHp(s: ShooterState): number {
  const section = currentSection(s.distance);
  return 1 + Math.floor(section * 0.8) + (s.rng() < 0.3 ? 1 : 0);
}

function spawnMob(s: ShooterState, x: number, z: number): void {
  const section = currentSection(s.distance);
  const hp = mobHp(s);
  pushEntity(s, {
    kind: "mob",
    x,
    z,
    w: 0.95,
    d: 0.95,
    h: 1.05,
    hp,
    maxHp: hp,
    speed: 2.2 + section * 0.35 + s.rng() * 0.6,
    chase: 0.18 + section * 0.05,
  });
}

function spawnElite(s: ShooterState, x: number, z: number): void {
  const section = currentSection(s.distance);
  const hp = 6 + section * 4 + Math.floor(s.rng() * 3);
  pushEntity(s, {
    kind: "elite",
    x,
    z,
    w: 1.7,
    d: 1.7,
    h: 1.9,
    hp,
    maxHp: hp,
    speed: 1.6 + section * 0.2,
    chase: 0.1,
  });
}

function spawnWall(s: ShooterState, x: number, w: number): void {
  const section = currentSection(s.distance);
  const hp = 14 + section * 10 + Math.floor(s.rng() * 6);
  pushEntity(s, {
    kind: "wall",
    x,
    z: SPAWN_Z,
    w,
    d: 1.4,
    h: 1.6,
    hp,
    maxHp: hp,
    speed: 0,
    chase: 0,
  });
}

function spawnBoss(s: ShooterState): void {
  s.bossSpawned = true;
  const hp = 380;
  pushEntity(s, {
    kind: "boss",
    x: 0,
    z: SPAWN_Z - 4,
    w: 4,
    d: 3.2,
    h: 3.6,
    hp,
    maxHp: hp,
    speed: 1.5,
    chase: 0,
  });
}

/** 몬스터 무리(격자 대형)를 한 덩어리로 만듭니다. */
function spawnPack(s: ShooterState, avoid: [number, number] | null, small = false): void {
  const section = currentSection(s.distance);
  const cols = 3 + Math.floor(s.rng() * 3); // 3~5열
  const rows = small ? 2 : 2 + Math.floor(s.rng() * 2) + (section >= 2 ? 1 : 0);
  const spacing = 1.05;
  const width = (cols - 1) * spacing;
  const limit = ROAD_HALF_WIDTH - 0.8 - width / 2;
  let cx = (s.rng() * 2 - 1) * Math.max(0, limit);
  if (avoid) {
    // 벽이 있는 가로 구간은 피해서 무리를 배치
    const wallCenter = (avoid[0] + avoid[1]) / 2;
    if (Math.abs(cx - wallCenter) < (avoid[1] - avoid[0]) / 2 + width / 2 + 0.3) {
      cx = wallCenter > 0 ? -Math.max(0, limit) : Math.max(0, limit);
    }
  }
  const zBase = SPAWN_Z - 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (s.rng() < 0.12) continue; // 약간 성긴 느낌
      const x = cx + (c - (cols - 1) / 2) * spacing + (s.rng() - 0.5) * 0.25;
      const z = zBase - r * 1.25 - s.rng() * 0.4;
      spawnMob(s, x, z);
    }
  }
  if (!small && section >= 1 && s.rng() < 0.35) {
    spawnElite(s, clamp(cx + (s.rng() - 0.5) * 3, -3.3, 3.3), zBase - rows * 1.25 - 1.5);
  }
}

function spawnGate(s: ShooterState): void {
  const section = currentSection(s.distance);
  const goodMax = 3 + Math.min(2, section);
  const badMax = 2 + Math.min(1, section);
  const good = () => 1 + Math.floor(s.rng() * goodMax);
  const bad = () => -(1 + Math.floor(s.rng() * badMax));
  const roll = s.rng();
  let a: number;
  let b: number;
  if (roll < 0.55) {
    a = good();
    b = bad();
  } else if (roll < 0.85) {
    a = good();
    b = good();
    if (a === b) b = Math.min(goodMax, b + 1);
  } else {
    a = bad();
    b = bad();
    if (a === b) b = a + 1 || -1;
  }
  const flip = s.rng() < 0.5;
  s.gates.push({ id: s.nextId++, z: SPAWN_Z, left: flip ? b : a, right: flip ? a : b, used: false });
}

function spawnInterval(section: number): number {
  return Math.max(1.9, 2.6 - 0.2 * section);
}

function spawnNext(s: ShooterState): void {
  const i = s.spawnIndex++;
  if (i % 4 === 3) {
    spawnGate(s);
    return;
  }
  if (i % 6 === 5) {
    const w = 2.4 + s.rng() * 1.2;
    const x = (s.rng() * 2 - 1) * (ROAD_LIMIT - w / 2);
    spawnWall(s, x, w);
    spawnPack(s, [x - w / 2, x + w / 2], true);
    return;
  }
  // 첫 무리는 작게 시작해서 조작을 익힐 짧은 여유를 줍니다.
  spawnPack(s, null, i === 0);
}

// ── 한 스텝 ──

function stepOnce(s: ShooterState, dt: number): void {
  s.time += dt;
  const boss = bossAlive(s);
  const scroll = boss ? BOSS_SCROLL_SPEED : SCROLL_SPEED;
  s.distance += scroll * dt;

  // 분대장 이동 (분대 폭만큼 안쪽까지만)
  const limit = ROAD_LIMIT - (squadHalfWidth(s.squad) - 0.3);
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

  // 웨이브 / 보스 생성
  if (!s.bossSpawned) {
    if (s.distance >= STAGE_LENGTH) {
      spawnBoss(s);
    } else if (s.distance < STAGE_LENGTH - LAST_SPAWN_MARGIN) {
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        spawnNext(s);
        s.spawnTimer += spawnInterval(currentSection(s.distance));
      }
    }
  } else if (boss) {
    s.bossMinionTimer -= dt;
    if (s.bossMinionTimer <= 0) {
      spawnPack(s, null, true);
      s.bossMinionTimer += 4.2;
    }
  }

  // 총알 이동 + 충돌 (가장 먼저 닿는 = z가 가장 큰 대상에 맞음)
  const survivors: Bullet[] = [];
  for (const b of s.bullets) {
    const stepZ = Math.abs(b.vz) * dt;
    b.z += b.vz * dt;

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
      hit.hp -= 1;
      hit.flash = 0.08;
      s.events.push({ type: "hit", x: b.x, z: hit.z + hit.d / 2, kind: hit.kind });
      continue;
    }
    if (b.z > b.endZ) survivors.push(b);
  }
  s.bullets = survivors;

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
    } else if (e.kind === "mob") {
      s.kills += 1;
      s.exp += 1;
    }
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
    s.phase = "clear";
    s.events.push({ type: "stageClear" });
    return;
  }

  // 적/장벽 이동 + 분대에 닿았을 때의 피해
  const remaining: Entity[] = [];
  for (const e of s.entities) {
    e.z += (scroll + e.speed) * dt;
    e.flash = Math.max(0, e.flash - dt);
    if (e.kind === "mob" || e.kind === "elite") {
      e.x += (s.player.x - e.x) * e.chase * dt;
    } else if (e.kind === "boss") {
      e.x = Math.sin(s.time * 0.8) * 2.0;
    }

    const reached = e.z + e.d / 2 >= -0.4;
    if (!reached) {
      remaining.push(e);
      continue;
    }

    if (e.kind === "boss") {
      setSquad(s, 0);
      s.events.push({ type: "hurt", lost: SQUAD_MAX, x: s.player.x });
      break;
    }
    if (e.kind === "wall") {
      const overlaps = Math.abs(e.x - s.player.x) < e.w / 2 + squadHalfWidth(s.squad);
      if (overlaps) {
        const lost = Math.min(3, s.squad);
        setSquad(s, s.squad - 3);
        s.events.push({ type: "hurt", lost, x: e.x });
        s.events.push({ type: "kill", x: e.x, z: e.z, kind: "wall" });
        continue; // 벽은 부서짐
      }
      if (e.z - e.d / 2 <= 4) remaining.push(e); // 옆으로 피했으면 그대로 지나감
      continue;
    }
    // 몬스터: 분대에 닿으면 병력을 잃고 몬스터도 사라짐
    const lost = Math.min(e.kind === "elite" ? 2 : 1, s.squad);
    setSquad(s, s.squad - (e.kind === "elite" ? 2 : 1));
    s.events.push({ type: "hurt", lost, x: e.x });
    s.events.push({ type: "kill", x: e.x, z: e.z, kind: e.kind });
  }
  s.entities = remaining;

  // 장벽(게이트): 분대장이 서 있는 쪽의 숫자가 적용됨
  for (const g of s.gates) {
    g.z += scroll * dt;
    if (!g.used && g.z >= -0.4) {
      g.used = true;
      const value = s.player.x < 0 ? g.left : g.right;
      setSquad(s, s.squad + value);
      s.events.push({ type: "gate", value, x: s.player.x });
    }
  }
  s.gates = s.gates.filter((g) => g.z < 6);

  if (s.squad <= 0) {
    s.phase = "gameover";
    const reason = boss ? "boss" : "mob";
    s.events.push({ type: "gameOver", reason });
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
