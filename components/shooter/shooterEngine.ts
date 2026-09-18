/**
 * 3D 슈팅 러너의 게임 규칙(이동, 자동 사격, 적/구조물, 레벨, 웨이브, 스테이지)만 담은 엔진입니다.
 * three.js나 DOM을 전혀 모르는 순수 로직이라, 화면 없이 시뮬레이션으로 밸런스를 검증할 수 있습니다.
 *
 * 좌표계: x = 좌우(오른쪽이 +), z = 앞뒤. 플레이어는 z = 0 에 고정되어 있고,
 * 도로가 뒤로 흘러가는 대신 적과 구조물이 -z(먼 곳)에서 +z(플레이어 쪽)로 다가옵니다.
 * 시간 단위는 초, 거리 단위는 "미터"(월드 단위)입니다.
 */

// ── 코스/플레이어 ──
export const ROAD_HALF_WIDTH = 4.6;
export const PLAYER_MAX_X = 3.5;
export const PLAYER_HALF_W = 0.45;
const KEY_SPEED = 9;
const DRAG_FOLLOW = 18;

// ── 사격 ──
export const FIRE_INTERVAL = 0.25;
export const BULLET_SPEED = 44;
export const BULLET_START_Z = -0.9;
export const BULLET_END_Z = -86;
/** 레벨별 동시 발사 수: LEVEL 1 = 1발, 2 = 2발, 3 = 3발, 4 = 5발 ... */
export const LEVEL_BULLETS = [1, 2, 3, 5, 6, 7, 8, 9, 10];
export const MAX_LEVEL = LEVEL_BULLETS.length;

// ── 스테이지 ──
export const SCROLL_SPEED = 6;
const BOSS_SCROLL_SPEED = 0.6;
export const STAGE_LENGTH = 520;
export const SECTION_LENGTH = 130;
export const SPAWN_Z = -72;
const BOSS_START_DISTANCE = STAGE_LENGTH;
/** 이 거리 안쪽에서는 일반 웨이브를 더 만들지 않아 보스 등장 전에 길이 정리됩니다 */
const LAST_WAVE_MARGIN = 40;

const LANES = [-3.2, -1.6, 0, 1.6, 3.2];

export type EntityKind = "mob" | "wall" | "boss";

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
  /** 맞았을 때 잠깐 하얗게 번쩍이는 남은 시간(초) */
  flash: number;
  /** 스스로 다가오는 속도 (도로 스크롤 속도에 더해짐) */
  speed: number;
  /** 좌우로 슬금슬금 플레이어를 따라가는 정도 */
  chase: number;
  /** 애니메이션/색 다양화용 고정 난수 */
  seed: number;
}

export interface Bullet {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
}

export type ShooterPhase = "ready" | "playing" | "gameover" | "clear";

export type ShooterEvent =
  | { type: "shoot"; count: number }
  | { type: "hit"; x: number; z: number; kind: EntityKind }
  | { type: "kill"; x: number; z: number; kind: EntityKind }
  | { type: "levelUp"; level: number; bullets: number }
  | { type: "gameOver"; reason: EntityKind }
  | { type: "stageClear" };

export interface ShooterState {
  phase: ShooterPhase;
  time: number;
  /** 지금까지 달린 거리(m) */
  distance: number;
  player: { x: number };
  input: { moveDir: -1 | 0 | 1; dragTargetX: number | null };
  entities: Entity[];
  bullets: Bullet[];
  kills: number;
  level: number;
  exp: number;
  fireTimer: number;
  waveTimer: number;
  waveCount: number;
  bossSpawned: boolean;
  nextId: number;
  /** 이번 update 동안 일어난 일들 (렌더러가 효과음/이펙트에 사용) */
  events: ShooterEvent[];
  rng: () => number;
}

export function bulletsForLevel(level: number): number {
  return LEVEL_BULLETS[Math.min(level, MAX_LEVEL) - 1];
}

/** 현재 레벨에서 다음 레벨까지 필요한 EXP (적 1마리 = EXP 1) */
export function expToNext(level: number): number {
  return Math.round(2 + (level - 1) * 1.4);
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
    entities: [],
    bullets: [],
    kills: 0,
    level: 1,
    exp: 0,
    fireTimer: 0.2,
    waveTimer: 1.2,
    waveCount: 0,
    bossSpawned: false,
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

// ── 생성 ──

function mobHp(s: ShooterState): number {
  const section = currentSection(s.distance);
  return 2 + Math.floor(section * 1.5) + Math.floor(s.time / 60) + Math.floor(s.rng() * 2);
}

function spawnMob(s: ShooterState, x: number, z: number): void {
  const section = currentSection(s.distance);
  const hp = mobHp(s);
  s.entities.push({
    id: s.nextId++,
    kind: "mob",
    x,
    z,
    w: 1.3,
    d: 1.3,
    h: 1.4,
    hp,
    maxHp: hp,
    flash: 0,
    speed: 1.2 + section * 0.25 + s.rng() * 0.4,
    chase: 0.1 + section * 0.04,
    seed: s.rng(),
  });
}

function spawnWall(s: ShooterState, x: number, w: number): void {
  const section = currentSection(s.distance);
  const hp = 10 + section * 8 + Math.floor(s.rng() * 5);
  s.entities.push({
    id: s.nextId++,
    kind: "wall",
    x,
    z: SPAWN_Z,
    w,
    d: 1.2,
    h: 1.5,
    hp,
    maxHp: hp,
    flash: 0,
    speed: 0,
    chase: 0,
    seed: s.rng(),
  });
}

function spawnBoss(s: ShooterState): void {
  s.bossSpawned = true;
  const hp = 220;
  s.entities.push({
    id: s.nextId++,
    kind: "boss",
    x: 0,
    z: -62,
    w: 3.6,
    d: 3,
    h: 3.4,
    hp,
    maxHp: hp,
    flash: 0,
    speed: 1.6,
    chase: 0,
    seed: s.rng(),
  });
}

function waveInterval(section: number): number {
  return Math.max(3.5, 4.7 - 0.4 * section);
}

function spawnWave(s: ShooterState): void {
  const section = currentSection(s.distance);
  s.waveCount += 1;

  // 3번째 웨이브마다 구조물(벽)이 섞여 나옵니다. 벽이 있는 가로 구간에는 적을 두지 않아
  // 벽이 적을 완전히 가리는 일이 없게 합니다.
  let wallSpan: [number, number] | null = null;
  if (s.waveCount % 3 === 0) {
    const w = 2.4 + s.rng() * 1.6;
    const x = (s.rng() * 2 - 1) * (PLAYER_MAX_X + 0.6 - w / 2);
    spawnWall(s, x, w);
    wallSpan = [x - w / 2 - 0.9, x + w / 2 + 0.9];
  }

  const count = Math.min(4, 2 + Math.floor(section * 0.5) + (s.rng() < 0.5 ? 1 : 0));
  const lanes = LANES.filter((lx) => !wallSpan || lx < wallSpan[0] || lx > wallSpan[1]);
  for (let i = lanes.length - 1; i > 0; i--) {
    const j = Math.floor(s.rng() * (i + 1));
    [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
  }
  for (let i = 0; i < Math.min(count, lanes.length); i++) {
    spawnMob(s, lanes[i] + (s.rng() - 0.5) * 0.4, SPAWN_Z - s.rng() * 7);
  }
}

// ── 사격 ──

function fire(s: ShooterState): void {
  const n = bulletsForLevel(s.level);
  // 총알이 늘수록 부채꼴로 퍼지되, 가까운 적에게도 여러 발이 맞도록 출발 위치도 조금씩 벌립니다.
  const spread = n === 1 ? 0 : Math.min(0.3, (n - 1) * 0.035);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5 .. 0.5
    const angle = t * spread * 2;
    s.bullets.push({
      id: s.nextId++,
      x: s.player.x + t * Math.min(2.4, (n - 1) * 0.34),
      z: BULLET_START_Z,
      vx: Math.sin(angle) * BULLET_SPEED,
      vz: -Math.cos(angle) * BULLET_SPEED,
    });
  }
  s.events.push({ type: "shoot", count: n });
}

// ── 한 스텝 ──

function stepOnce(s: ShooterState, dt: number): void {
  s.time += dt;
  const boss = bossAlive(s);
  const scroll = boss ? BOSS_SCROLL_SPEED : SCROLL_SPEED;
  s.distance += scroll * dt;

  // 플레이어 좌우 이동 (키보드는 등속, 드래그는 목표 지점을 부드럽게 따라감)
  if (s.input.dragTargetX !== null) {
    const target = clamp(s.input.dragTargetX, -PLAYER_MAX_X, PLAYER_MAX_X);
    s.player.x += (target - s.player.x) * (1 - Math.exp(-DRAG_FOLLOW * dt));
  } else {
    s.player.x += s.input.moveDir * KEY_SPEED * dt;
  }
  s.player.x = clamp(s.player.x, -PLAYER_MAX_X, PLAYER_MAX_X);

  // 자동 사격
  s.fireTimer -= dt;
  while (s.fireTimer <= 0) {
    fire(s);
    s.fireTimer += FIRE_INTERVAL;
  }

  // 웨이브 / 보스 생성
  if (!s.bossSpawned) {
    if (s.distance >= BOSS_START_DISTANCE) {
      spawnBoss(s);
    } else if (s.distance < BOSS_START_DISTANCE - LAST_WAVE_MARGIN) {
      s.waveTimer -= dt;
      if (s.waveTimer <= 0) {
        spawnWave(s);
        s.waveTimer += waveInterval(currentSection(s.distance));
      }
    }
  }

  // 총알 이동 + 충돌 (가장 먼저 닿는 = z가 가장 큰 대상에 맞음)
  const survivors: Bullet[] = [];
  for (const b of s.bullets) {
    const stepZ = Math.abs(b.vz) * dt;
    b.x += b.vx * dt;
    b.z += b.vz * dt;

    let hit: Entity | null = null;
    for (const e of s.entities) {
      if (
        Math.abs(b.x - e.x) <= e.w / 2 + 0.12 &&
        b.z <= e.z + e.d / 2 &&
        b.z >= e.z - e.d / 2 - stepZ
      ) {
        if (!hit || e.z > hit.z) hit = e;
      }
    }

    if (hit) {
      hit.hp -= 1;
      hit.flash = 0.1;
      s.events.push({ type: "hit", x: b.x, z: hit.z + hit.d / 2, kind: hit.kind });
      continue; // 총알은 사라짐
    }
    if (b.z > BULLET_END_Z && Math.abs(b.x) < ROAD_HALF_WIDTH + 6) survivors.push(b);
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
      s.exp += 15;
    } else if (e.kind === "mob") {
      s.kills += 1;
      s.exp += 1;
    }
  }
  s.entities = alive;

  while (s.level < MAX_LEVEL && s.exp >= expToNext(s.level)) {
    s.exp -= expToNext(s.level);
    s.level += 1;
    s.events.push({ type: "levelUp", level: s.level, bullets: bulletsForLevel(s.level) });
  }
  if (s.level >= MAX_LEVEL) s.exp = 0;

  if (bossKilled) {
    s.phase = "clear";
    s.events.push({ type: "stageClear" });
    return;
  }

  // 적/구조물 이동, 플레이어 도달 판정
  for (const e of s.entities) {
    e.z += (scroll + e.speed) * dt;
    e.flash = Math.max(0, e.flash - dt);

    if (e.kind === "mob") {
      e.x += (s.player.x - e.x) * e.chase * dt;
    } else if (e.kind === "boss") {
      e.x = Math.sin(s.time * 0.9) * 2.2;
    }

    const reached = e.z + e.d / 2 >= -0.5;
    if (!reached) continue;

    // 적(몬스터/보스)은 플레이어 라인에 닿기만 해도 패배, 벽은 몸이 겹칠 때만 패배 (옆으로 피할 수 있음)
    const overlapsPlayer = Math.abs(e.x - s.player.x) < e.w / 2 + PLAYER_HALF_W;
    if (e.kind !== "wall" || overlapsPlayer) {
      s.phase = "gameover";
      s.events.push({ type: "gameOver", reason: e.kind });
      return;
    }
  }
  s.entities = s.entities.filter((e) => !(e.kind === "wall" && e.z - e.d / 2 > 4));
}

const FIXED_DT = 1 / 60;
const MAX_STEPS_PER_UPDATE = 6;

/**
 * 실제 경과 시간(초)만큼 게임을 진행합니다. 고정 간격(1/60초)으로 잘게 나눠 계산하므로
 * 프레임이 떨어져도 총알이 적을 뚫고 지나가지 않습니다.
 */
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
