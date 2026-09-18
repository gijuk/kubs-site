import * as THREE from "three";
import {
  ROAD_HALF_WIDTH,
  SQUAD_MAX,
  formation,
  squadHalfWidth,
  type Entity,
  type ShooterEvent,
  type ShooterState,
} from "./shooterEngine";

/**
 * three.js 렌더러: ShooterState(게임 규칙)를 읽어 화면에 그리기만 합니다.
 * 외부 3D 모델 없이 기본 geometry 조합으로 병력/몬스터/장벽을 만들고,
 * 병력·몬스터·총알처럼 개수가 많은 것은 InstancedMesh로 묶어 그려서 모바일에서도 가볍게 돕니다.
 */

export interface ShooterRenderer {
  resize(width: number, height: number): void;
  render(state: ShooterState, dt: number): void;
  dispose(): void;
}

function pillPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  // 구형 브라우저에도 있는 arc로 둥근 사각형 경로를 만듭니다. (roundRect 미지원 대비)
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

const SKY = 0x8fd6ff;
const MAX_BULLETS = 520;
const MAX_PARTICLES = 220;
const MAX_ENEMY_INSTANCES = 200;
const DASH_ROWS = 15;
const DASH_SPACING = 8;
const DECOR_PER_SIDE = 22;
const DECOR_SPACING = 7;
const CLOUD_COUNT = 9;

const DECOR_COLORS = [0xff9eb5, 0xffd166, 0x7ee0c3, 0x8ab6ff, 0xc6a4ff];
const WALL_COLORS = [0xffb26b, 0x6fd6c0, 0xff8fb1, 0x8fb4ff];
const MOB_COLORS = [0xa46bf5, 0xa46bf5, 0xb885ff, 0x9a5ff0];
const ELITE_COLOR = 0xff6f8a;

interface EntityView {
  group: THREE.Group;
  sprite: THREE.Sprite;
  flashMats: THREE.MeshLambertMaterial[];
  lastHp: number;
  kind: Entity["kind"];
}

interface GateView {
  group: THREE.Group;
  mats: THREE.MeshBasicMaterial[];
  sprites: THREE.Sprite[];
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  color: number;
}

interface Popup {
  sprite: THREE.Sprite;
  x: number;
  z: number;
  life: number;
}

export function createRenderer(canvas: HTMLCanvasElement): ShooterRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(SKY);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  // 멀리서 갑자기 나타나는 느낌이 덜하도록 하늘색으로 서서히 묻히게 합니다.
  scene.fog = new THREE.Fog(SKY, 24, 62);

  const camera = new THREE.PerspectiveCamera(70, 9 / 16, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfe0f0, 1.75));
  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(4, 12, 8);
  scene.add(sun);

  // ── 공용 geometry / material ──
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  const sphereGeo = track(new THREE.SphereGeometry(1, 14, 10));
  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const coneGeo = track(new THREE.ConeGeometry(1, 1, 8));
  const cylGeo = track(new THREE.CylinderGeometry(1, 1, 1, 10));
  const white = track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const black = track(new THREE.MeshBasicMaterial({ color: 0x1d1b26 }));
  const orange = track(new THREE.MeshLambertMaterial({ color: 0xff9a3c }));
  const stripe = track(new THREE.MeshLambertMaterial({ color: 0x2b1b12 }));
  const gray = track(new THREE.MeshLambertMaterial({ color: 0x5f6675 }));
  const gold = track(new THREE.MeshLambertMaterial({ color: 0xffd84d }));

  function mesh(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number
  ): THREE.Mesh {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    return m;
  }

  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();
  /** 음수도 안전한 나머지 (0 이상 m 미만) */
  const wrap = (v: number, m: number) => ((v % m) + m) % m;

  function setInstance(
    im: THREE.InstancedMesh,
    i: number,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    ry = 0
  ) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, ry, 0);
    dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
  }

  // ── 도로 ──
  const roadMat = track(new THREE.MeshLambertMaterial({ color: 0xe6ebf2 }));
  scene.add(mesh(boxGeo, roadMat, ROAD_HALF_WIDTH * 2 + 0.4, 0.5, 240, 0, -0.25, -100));
  const edgeMat = track(new THREE.MeshLambertMaterial({ color: 0xdfe5ee }));
  for (const side of [-1, 1]) {
    scene.add(mesh(boxGeo, edgeMat, 0.5, 0.7, 240, side * (ROAD_HALF_WIDTH + 0.45), -0.1, -100));
  }

  const dashCols = [-2.4, -0.8, 0.8, 2.4];
  const dashes = new THREE.InstancedMesh(
    boxGeo,
    track(new THREE.MeshLambertMaterial({ color: 0xffffff })),
    dashCols.length * DASH_ROWS
  );
  scene.add(dashes);

  const decor = new THREE.InstancedMesh(
    boxGeo,
    track(new THREE.MeshLambertMaterial({ color: 0xffffff })),
    DECOR_PER_SIDE * 2
  );
  for (let i = 0; i < DECOR_PER_SIDE * 2; i++) {
    decor.setColorAt(i, tmpColor.setHex(DECOR_COLORS[i % DECOR_COLORS.length]));
  }
  scene.add(decor);

  const clouds = new THREE.InstancedMesh(
    sphereGeo,
    track(new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 })),
    CLOUD_COUNT * 3
  );
  scene.add(clouds);
  const cloudSeeds = Array.from({ length: CLOUD_COUNT }, (_, i) => ({
    x: (i % 2 === 0 ? -1 : 1) * (9 + ((i * 37) % 13)),
    y: -3 + ((i * 53) % 7) * 0.9,
    z: -((i * 41) % 170),
    s: 2.2 + ((i * 29) % 10) * 0.25,
  }));

  // ── 바닥 그림자 / 병력 위치 표시 링 ──
  const shadowGeo = track(new THREE.CircleGeometry(1, 20));
  const shadowMat = track(
    new THREE.MeshBasicMaterial({ color: 0x5a7391, transparent: true, opacity: 0.18, depthWrite: false })
  );
  function blobShadow(radius: number): THREE.Mesh {
    const m = new THREE.Mesh(shadowGeo, shadowMat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.03;
    m.scale.set(radius, radius, radius);
    return m;
  }

  // 분대 발밑의 초록 원 (레퍼런스처럼 "여기가 내 병력")
  const squadRing = new THREE.Mesh(
    track(new THREE.RingGeometry(0.9, 1, 48)),
    track(
      new THREE.MeshBasicMaterial({
        color: 0x62ff8a,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
  );
  squadRing.rotation.x = -Math.PI / 2;
  squadRing.position.y = 0.05;
  scene.add(squadRing);
  const squadDisc = new THREE.Mesh(
    track(new THREE.CircleGeometry(1, 40)),
    track(
      new THREE.MeshBasicMaterial({ color: 0x62ff8a, transparent: true, opacity: 0.16, depthWrite: false })
    )
  );
  squadDisc.rotation.x = -Math.PI / 2;
  squadDisc.position.y = 0.045;
  scene.add(squadDisc);

  // ── 병력(귀여운 호랑이) — 파츠별 InstancedMesh ──
  const SQ = SQUAD_MAX + 4;
  const sBody = new THREE.InstancedMesh(sphereGeo, orange, SQ);
  const sHead = new THREE.InstancedMesh(sphereGeo, orange, SQ);
  const sEars = new THREE.InstancedMesh(sphereGeo, orange, SQ * 2);
  const sStripes = new THREE.InstancedMesh(boxGeo, stripe, SQ * 2);
  const sGun = new THREE.InstancedMesh(boxGeo, gray, SQ);
  for (const m of [sBody, sHead, sEars, sStripes, sGun]) {
    m.frustumCulled = false;
    scene.add(m);
  }
  const sx = new Float32Array(SQ);
  const sz = new Float32Array(SQ);
  const born = new Float32Array(SQ);
  let prevSquad = 0;

  // ── 몬스터(무리) — 몸통/눈/뿔 InstancedMesh ──
  const eBody = new THREE.InstancedMesh(
    sphereGeo,
    track(new THREE.MeshLambertMaterial({ color: 0xffffff })),
    MAX_ENEMY_INSTANCES
  );
  const eEyes = new THREE.InstancedMesh(sphereGeo, white, MAX_ENEMY_INSTANCES * 2);
  const ePupils = new THREE.InstancedMesh(sphereGeo, black, MAX_ENEMY_INSTANCES * 2);
  const eHorns = new THREE.InstancedMesh(coneGeo, gold, MAX_ENEMY_INSTANCES * 2);
  const eShadows = new THREE.InstancedMesh(shadowGeo, shadowMat, MAX_ENEMY_INSTANCES);
  for (const m of [eBody, eEyes, ePupils, eHorns, eShadows]) {
    m.frustumCulled = false;
    scene.add(m);
  }
  for (let i = 0; i < MAX_ENEMY_INSTANCES; i++) eBody.setColorAt(i, tmpColor.setHex(0xa46bf5));

  // ── 총알 + 궤적 ──
  const bullets = new THREE.InstancedMesh(
    sphereGeo,
    track(new THREE.MeshBasicMaterial({ color: 0xfff36b })),
    MAX_BULLETS
  );
  bullets.frustumCulled = false;
  scene.add(bullets);
  const trailGeo = track(new THREE.BoxGeometry(0.09, 0.09, 1));
  trailGeo.translate(0, 0, 0.5);
  const trails = new THREE.InstancedMesh(
    trailGeo,
    track(
      new THREE.MeshBasicMaterial({
        color: 0xffb830,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    ),
    MAX_BULLETS
  );
  trails.frustumCulled = false;
  scene.add(trails);

  // ── 파편 ──
  const particleMesh = new THREE.InstancedMesh(
    boxGeo,
    track(new THREE.MeshBasicMaterial({ color: 0xffffff })),
    MAX_PARTICLES
  );
  particleMesh.frustumCulled = false;
  for (let i = 0; i < MAX_PARTICLES; i++) particleMesh.setColorAt(i, tmpColor.setHex(0xffffff));
  scene.add(particleMesh);
  const particles: Particle[] = [];

  // ── 레벨업 링 ──
  const ring = new THREE.Mesh(
    track(new THREE.RingGeometry(0.85, 1, 40)),
    track(
      new THREE.MeshBasicMaterial({
        color: 0xffe066,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.07;
  ring.visible = false;
  scene.add(ring);
  let ringT = 1;

  // ── 텍스트 스프라이트 텍스처 (내용별로 캐시해 재사용) ──
  const textures = new Map<string, THREE.CanvasTexture>();
  function labelTexture(key: string, draw: (g: CanvasRenderingContext2D) => void, w = 160, h = 80) {
    const cached = textures.get(key);
    if (cached) return cached;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    textures.set(key, tex);
    return tex;
  }

  function hpTexture(kind: Entity["kind"], hp: number) {
    return labelTexture(`hp:${kind}:${hp}`, (g) => {
      g.fillStyle = kind === "boss" ? "#ff6b7a" : kind === "wall" ? "#ffd166" : "#ffffff";
      g.strokeStyle = "#2b2f3a";
      g.lineWidth = 6;
      pillPath(g, 6, 8, 148, 64, 26);
      g.fill();
      g.stroke();
      g.font = "900 46px 'Arial Black', Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      if (kind === "boss") {
        g.strokeStyle = "#2b2f3a";
        g.lineWidth = 6;
        g.strokeText(String(hp), 80, 42);
        g.fillStyle = "#ffffff";
      } else {
        g.fillStyle = "#2b2f3a";
      }
      g.fillText(String(hp), 80, 42);
    });
  }

  /** 장벽/팝업 숫자: 굵은 흰 글씨 + 진한 외곽선 */
  function bigNumberTexture(text: string, fill: string, stroke: string) {
    return labelTexture(
      `num:${text}:${fill}`,
      (g) => {
        g.font = "900 96px 'Arial Black', Arial, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.lineJoin = "round";
        g.lineWidth = 16;
        g.strokeStyle = stroke;
        g.strokeText(text, 128, 68);
        g.fillStyle = fill;
        g.fillText(text, 128, 68);
      },
      256,
      128
    );
  }

  function squadTexture(n: number) {
    return labelTexture(`squad:${n}`, (g) => {
      g.fillStyle = "#2f7dff";
      g.strokeStyle = "#ffffff";
      g.lineWidth = 6;
      pillPath(g, 6, 8, 148, 64, 26);
      g.fill();
      g.stroke();
      g.fillStyle = "#ffffff";
      g.font = "900 44px 'Arial Black', Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(String(n), 80, 42);
    });
  }

  function makeSprite(tex: THREE.Texture, w: number, h: number): THREE.Sprite {
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, fog: false, transparent: true });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(w, h, 1);
    sp.renderOrder = 20;
    return sp;
  }

  // 분대 인원수 표시 (병력 머리 위)
  const squadLabel = makeSprite(squadTexture(SQUAD_MAX), 1.3, 0.65);
  scene.add(squadLabel);
  let lastSquadLabel = -1;

  // ── 벽/보스/정예 뷰 ──
  const views = new Map<number, EntityView>();

  function buildBoss(): { group: THREE.Group; mats: THREE.MeshLambertMaterial[] } {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xff5c6c });
    const limbMat = new THREE.MeshLambertMaterial({ color: 0xd8404f });
    group.add(mesh(sphereGeo, bodyMat, 0.62, 0.58, 0.6, 0, 0.62, 0));
    group.add(mesh(sphereGeo, white, 0.17, 0.2, 0.1, -0.24, 0.78, 0.52));
    group.add(mesh(sphereGeo, white, 0.17, 0.2, 0.1, 0.24, 0.78, 0.52));
    group.add(mesh(sphereGeo, black, 0.075, 0.09, 0.05, -0.24, 0.76, 0.6));
    group.add(mesh(sphereGeo, black, 0.075, 0.09, 0.05, 0.24, 0.76, 0.6));
    group.add(mesh(boxGeo, black, 0.3, 0.07, 0.05, 0, 0.5, 0.58));
    for (const dx of [-0.32, 0, 0.32]) group.add(mesh(coneGeo, gold, 0.12, 0.34, 0.12, dx, 1.42, 0));
    group.add(mesh(sphereGeo, limbMat, 0.14, 0.14, 0.14, -0.62, 0.55, 0.15));
    group.add(mesh(sphereGeo, limbMat, 0.14, 0.14, 0.14, 0.62, 0.55, 0.15));
    group.add(mesh(sphereGeo, limbMat, 0.17, 0.1, 0.2, -0.28, 0.08, 0.1));
    group.add(mesh(sphereGeo, limbMat, 0.17, 0.1, 0.2, 0.28, 0.08, 0.1));
    group.add(blobShadow(0.85));
    group.scale.setScalar(2.8);
    return { group, mats: [bodyMat, limbMat] };
  }

  function buildWall(e: Entity): { group: THREE.Group; mats: THREE.MeshLambertMaterial[] } {
    const group = new THREE.Group();
    const color = WALL_COLORS[Math.floor(e.seed * WALL_COLORS.length) % WALL_COLORS.length];
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const capMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    group.add(mesh(boxGeo, bodyMat, e.w, e.h, e.d, 0, e.h / 2, 0));
    group.add(mesh(boxGeo, capMat, e.w + 0.08, 0.16, e.d + 0.08, 0, e.h + 0.08, 0));
    const lineMat = new THREE.MeshLambertMaterial({ color: 0x000000, transparent: true, opacity: 0.12 });
    group.add(mesh(boxGeo, lineMat, e.w + 0.02, 0.05, e.d + 0.02, 0, e.h * 0.35, 0));
    group.add(mesh(boxGeo, lineMat, e.w + 0.02, 0.05, e.d + 0.02, 0, e.h * 0.68, 0));
    return { group, mats: [bodyMat, capMat] };
  }

  function createView(e: Entity): EntityView {
    let built: { group: THREE.Group; mats: THREE.MeshLambertMaterial[] };
    if (e.kind === "boss") built = buildBoss();
    else if (e.kind === "wall") built = buildWall(e);
    else built = { group: new THREE.Group(), mats: [] }; // 정예: 몸은 인스턴스로 그리고 HP 라벨만 여기서

    const sprite = makeSprite(hpTexture(e.kind, e.hp), 1, 0.5);
    const sw = e.kind === "boss" ? 3.4 : e.kind === "wall" ? 1.8 : 1.4;
    sprite.scale.set(sw, sw / 2, 1);
    sprite.position.y = e.h + (e.kind === "boss" ? 0.9 : 0.6);

    const holder = new THREE.Group();
    holder.add(built.group);
    holder.add(sprite);
    scene.add(holder);
    return { group: holder, sprite, flashMats: built.mats, lastHp: e.hp, kind: e.kind };
  }

  function removeView(id: number, v: EntityView) {
    scene.remove(v.group);
    (v.sprite.material as THREE.SpriteMaterial).dispose();
    for (const m of v.flashMats) m.dispose();
    views.delete(id);
  }

  // ── 장벽(게이트) 뷰 ──
  const gateViews = new Map<number, GateView>();
  const postMat = track(new THREE.MeshLambertMaterial({ color: 0x2f7dff }));
  const postTopMat = track(new THREE.MeshLambertMaterial({ color: 0xffffff }));

  function createGateView(left: number, right: number): GateView {
    const group = new THREE.Group();
    const mats: THREE.MeshBasicMaterial[] = [];
    const sprites: THREE.Sprite[] = [];
    const half = ROAD_HALF_WIDTH + 0.2;
    for (const side of [-1, 1]) {
      const value = side < 0 ? left : right;
      const good = value >= 0;
      const mat = new THREE.MeshBasicMaterial({
        color: good ? 0x35b8ff : 0xff5a63,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      });
      mats.push(mat);
      const band = new THREE.Mesh(boxGeo, mat);
      band.scale.set(half, 0.06, 2.0);
      band.position.set(side * (half / 2), 0.05, 0);
      group.add(band);
      // 밝은 테두리선
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
      mats.push(lineMat);
      for (const dz of [-1.0, 1.0]) {
        const line = new THREE.Mesh(boxGeo, lineMat);
        line.scale.set(half, 0.07, 0.08);
        line.position.set(side * (half / 2), 0.07, dz);
        group.add(line);
      }
      const text = value > 0 ? `+${value}` : String(value);
      const sp = makeSprite(
        bigNumberTexture(text, "#ffffff", good ? "#0b5ea8" : "#a3142a"),
        2.6,
        1.3
      );
      sp.position.set(side * (half / 2), 1.15, 0);
      group.add(sp);
      sprites.push(sp);
    }
    // 기둥 (가운데 + 양끝)
    for (const px of [-half, 0, half]) {
      group.add(mesh(cylGeo, postMat, 0.13, 1.5, 0.13, px, 0.75, 0));
      group.add(mesh(boxGeo, postTopMat, 0.34, 0.18, 0.34, px, 1.55, 0));
    }
    scene.add(group);
    return { group, mats, sprites };
  }

  function removeGateView(id: number, v: GateView) {
    scene.remove(v.group);
    for (const m of v.mats) m.dispose();
    for (const sp of v.sprites) (sp.material as THREE.SpriteMaterial).dispose();
    gateViews.delete(id);
  }

  // ── 떠오르는 숫자 팝업 (+2, -1 ...) ──
  const popups: Popup[] = [];
  function spawnPopup(text: string, good: boolean, x: number, z: number) {
    const sp = makeSprite(bigNumberTexture(text, "#ffffff", good ? "#0f9d58" : "#d92d45"), 2, 1);
    scene.add(sp);
    popups.push({ sprite: sp, x, z, life: 0 });
  }

  // ── 효과 ──
  function burst(x: number, y: number, z: number, count: number, colors: number[], power: number) {
    for (let i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const a = Math.random() * Math.PI * 2;
      const v = (0.4 + Math.random()) * power;
      particles.push({
        x,
        y,
        z,
        vx: Math.cos(a) * v,
        vy: (0.5 + Math.random()) * power * 0.9,
        vz: Math.sin(a) * v + 2,
        life: 0,
        max: 0.4 + Math.random() * 0.35,
        size: 0.1 + Math.random() * 0.12,
        color: colors[i % colors.length],
      });
    }
  }

  let kick = 0;
  let scroll = 0;
  let time = 0;
  let aspect = 9 / 16;
  let speedFov = 0;

  function handleEvents(events: ShooterEvent[], state: ShooterState) {
    for (const ev of events) {
      switch (ev.type) {
        case "hit":
          if (Math.random() < 0.35) burst(ev.x, 0.9, ev.z, 1, [0xfff36b, 0xffffff], 2.5);
          break;
        case "kill": {
          const cols =
            ev.kind === "wall"
              ? [0xffd166, 0xffffff, 0xb0b8c8]
              : ev.kind === "boss"
              ? [0xff5c6c, 0xffd84d, 0xffffff]
              : ev.kind === "elite"
              ? [0xff6f8a, 0xffe066, 0xffffff]
              : [0xa46bf5, 0xffe066];
          const n = ev.kind === "boss" ? 46 : ev.kind === "wall" ? 16 : ev.kind === "elite" ? 14 : 5;
          burst(ev.x, 0.8, ev.z, n, cols, ev.kind === "boss" ? 7 : 4.5);
          break;
        }
        case "hurt":
          kick = Math.max(kick, 0.9);
          spawnPopup(`-${ev.lost}`, false, state.player.x, 0);
          burst(state.player.x, 0.8, 0, 8, [0xff5a63, 0xffffff], 4);
          break;
        case "gate":
          spawnPopup(ev.value > 0 ? `+${ev.value}` : String(ev.value), ev.value >= 0, ev.x, 0);
          kick = Math.max(kick, ev.value >= 0 ? 0.3 : 0.7);
          break;
        case "levelUp":
          ringT = 0;
          kick = Math.max(kick, 1);
          break;
        case "gameOver":
          kick = 1.4;
          break;
        default:
          break;
      }
    }
  }

  function fitCamera() {
    // 가로로 항상 같은 폭(도로 전체)이 보이도록 세로 시야각을 화면 비율에 맞춰 계산합니다.
    const hFov = (50 * Math.PI) / 180;
    const vFov = 2 * Math.atan(Math.tan(hFov / 2) / aspect);
    camera.fov = Math.min(84, Math.max(38, (vFov * 180) / Math.PI)) + speedFov;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  return {
    resize(width: number, height: number) {
      const w = Math.max(1, Math.floor(width));
      const h = Math.max(1, Math.floor(height));
      renderer.setSize(w, h, false);
      aspect = w / h;
      fitCamera();
    },

    render(state: ShooterState, dt: number) {
      time += dt;
      kick = Math.max(0, kick - dt * 2.4);
      handleEvents(state.events, state);

      scroll = state.phase === "ready" ? scroll + dt * 3 : state.phase === "playing" ? state.distance : scroll;

      // 도로 점선 / 길가 블록 / 구름 (스크롤)
      let di = 0;
      const dashSpan = DASH_ROWS * DASH_SPACING;
      for (const cx of dashCols) {
        for (let r = 0; r < DASH_ROWS; r++) {
          setInstance(dashes, di++, cx, 0.01, 12 - wrap(r * DASH_SPACING - scroll, dashSpan), 0.14, 0.02, 2.6);
        }
      }
      dashes.instanceMatrix.needsUpdate = true;

      const decorSpan = DECOR_PER_SIDE * DECOR_SPACING;
      let ci = 0;
      for (const side of [-1, 1]) {
        for (let r = 0; r < DECOR_PER_SIDE; r++) {
          const tall = 0.8 + ((r * 7 + (side > 0 ? 3 : 0)) % 4) * 0.35;
          setInstance(
            decor,
            ci++,
            side * (ROAD_HALF_WIDTH + 1.25),
            tall / 2 - 0.1,
            12 - wrap(r * DECOR_SPACING - scroll, decorSpan),
            0.8,
            tall,
            0.8
          );
        }
      }
      decor.instanceMatrix.needsUpdate = true;

      let cli = 0;
      for (const c of cloudSeeds) {
        const z = 20 - wrap(20 - c.z - scroll * 0.35, 190);
        for (let k = 0; k < 3; k++) {
          setInstance(
            clouds,
            cli++,
            c.x + (k - 1) * c.s * 0.9,
            c.y + (k === 1 ? 0.5 : 0),
            z,
            c.s * (k === 1 ? 1.1 : 0.8),
            c.s * 0.55,
            c.s * 0.8
          );
        }
      }
      clouds.instanceMatrix.needsUpdate = true;

      // ── 병력 ──
      const running = state.phase === "playing";
      const n = state.squad;
      const slots = formation(Math.max(1, n));
      // 새 판이 시작됐거나 병력이 처음 나타나면 자리로 바로 이동
      const snap = state.time < 0.1 || prevSquad === 0;
      if (n > prevSquad) {
        for (let i = prevSquad; i < n; i++) {
          sx[i] = state.player.x + slots[i].dx;
          sz[i] = slots[i].dz;
          born[i] = snap ? -10 : time;
        }
      } else if (n < prevSquad) {
        for (let i = n; i < prevSquad; i++) {
          burst(sx[i], 0.6, sz[i], 4, [0xff9a3c, 0xffffff], 3);
        }
      }
      prevSquad = n;

      const follow = 1 - Math.exp(-14 * dt);
      const moving = running ? state.input.moveDir : 0;
      for (let i = 0; i < n; i++) {
        const tx = state.player.x + slots[i].dx;
        const tz = slots[i].dz;
        sx[i] = snap ? tx : sx[i] + (tx - sx[i]) * follow;
        sz[i] = snap ? tz : sz[i] + (tz - sz[i]) * follow;
        const pop = Math.min(1, (time - born[i]) / 0.28);
        const k = pop >= 1 ? 1 : pop * (1.25 - 0.25 * pop);
        const bob = running ? Math.abs(Math.sin(time * 14 + i * 1.7)) * 0.07 : Math.sin(time * 2.4 + i) * 0.015;
        const x = sx[i];
        const z = sz[i];
        setInstance(sBody, i, x, bob + 0.42 * k, z, 0.34 * k, 0.36 * k, 0.32 * k);
        setInstance(sHead, i, x, bob + 0.88 * k, z - 0.02, 0.29 * k, 0.27 * k, 0.26 * k);
        setInstance(sEars, i * 2, x - 0.2 * k, bob + 1.1 * k, z, 0.09 * k, 0.09 * k, 0.06 * k);
        setInstance(sEars, i * 2 + 1, x + 0.2 * k, bob + 1.1 * k, z, 0.09 * k, 0.09 * k, 0.06 * k);
        setInstance(sStripes, i * 2, x, bob + 0.5 * k, z + 0.3 * k, 0.36 * k, 0.05 * k, 0.04 * k);
        setInstance(sStripes, i * 2 + 1, x, bob + 0.65 * k, z + 0.27 * k, 0.3 * k, 0.05 * k, 0.04 * k);
        setInstance(sGun, i, x + 0.22 * k, bob + 0.55 * k, z - 0.28 * k, 0.08 * k, 0.08 * k, 0.4 * k, -moving * 0.05);
      }
      for (const m of [sBody, sHead, sGun]) {
        m.count = n;
        m.instanceMatrix.needsUpdate = true;
      }
      sEars.count = n * 2;
      sStripes.count = n * 2;
      sEars.instanceMatrix.needsUpdate = true;
      sStripes.instanceMatrix.needsUpdate = true;

      // 분대 발밑 원 + 인원수 라벨
      const half = squadHalfWidth(Math.max(1, n));
      const rows = Math.ceil(n / Math.max(1, Math.min(n, 5, Math.ceil(Math.sqrt(n) * 1.3))));
      const ringR = half + 0.55;
      const ringZ = ((rows - 1) * 0.8) / 2;
      squadRing.position.set(state.player.x, 0.05, ringZ);
      squadRing.scale.set(ringR, ringR * (0.55 + rows * 0.08), 1);
      squadDisc.position.set(state.player.x, 0.045, ringZ);
      squadDisc.scale.set(ringR, ringR * (0.55 + rows * 0.08), 1);
      squadRing.visible = squadDisc.visible = n > 0;
      if (n !== lastSquadLabel && n > 0) {
        (squadLabel.material as THREE.SpriteMaterial).map = squadTexture(n);
        (squadLabel.material as THREE.SpriteMaterial).needsUpdate = true;
        lastSquadLabel = n;
      }
      squadLabel.visible = n > 0;
      squadLabel.position.set(state.player.x, 1.95, ringZ);

      // ── 몬스터 무리(인스턴스) + 벽/보스/정예 라벨(뷰) ──
      const seen = new Set<number>();
      let ei = 0;
      for (const e of state.entities) {
        if (e.kind === "mob" || e.kind === "elite") {
          if (ei >= MAX_ENEMY_INSTANCES) continue;
          const r = e.w / 2;
          const bob = Math.abs(Math.sin(time * 9 + e.seed * 20)) * 0.12 * (e.kind === "elite" ? 1.6 : 1);
          const squash = 1 + Math.sin(time * 9 + e.seed * 20) * 0.06;
          const y = bob + r * 0.95;
          setInstance(eBody, ei, e.x, y, e.z, r / squash, r * 0.92 * squash, r * 0.95 / squash);
          eBody.setColorAt(
            ei,
            tmpColor.setHex(
              e.flash > 0 ? 0xffffff : e.kind === "elite" ? ELITE_COLOR : MOB_COLORS[Math.floor(e.seed * 4) % 4]
            )
          );
          setInstance(eEyes, ei * 2, e.x - r * 0.36, y + r * 0.28, e.z + r * 0.78, r * 0.26, r * 0.3, r * 0.16);
          setInstance(eEyes, ei * 2 + 1, e.x + r * 0.36, y + r * 0.28, e.z + r * 0.78, r * 0.26, r * 0.3, r * 0.16);
          setInstance(ePupils, ei * 2, e.x - r * 0.36, y + r * 0.24, e.z + r * 0.9, r * 0.11, r * 0.13, r * 0.08);
          setInstance(ePupils, ei * 2 + 1, e.x + r * 0.36, y + r * 0.24, e.z + r * 0.9, r * 0.11, r * 0.13, r * 0.08);
          setInstance(eHorns, ei * 2, e.x - r * 0.55, y + r * 0.95, e.z, r * 0.2, r * 0.5, r * 0.2);
          setInstance(eHorns, ei * 2 + 1, e.x + r * 0.55, y + r * 0.95, e.z, r * 0.2, r * 0.5, r * 0.2);
          // 그림자는 바닥에 눕혀서
          dummy.rotation.set(-Math.PI / 2, 0, 0);
          dummy.position.set(e.x, 0.03, e.z);
          dummy.scale.set(r * 1.05, r * 1.05, r * 1.05);
          dummy.updateMatrix();
          eShadows.setMatrixAt(ei, dummy.matrix);
          ei++;
          if (e.kind !== "elite") continue;
        }

        seen.add(e.id);
        let v = views.get(e.id);
        if (!v) {
          v = createView(e);
          views.set(e.id, v);
        }
        if (e.kind === "boss") {
          const wob = Math.abs(Math.sin(time * 3 + e.seed * 10)) * 0.25;
          v.group.position.set(e.x, wob, e.z);
          const squash = 1 + Math.sin(time * 3) * 0.04;
          v.group.scale.set(1 / squash, squash, 1 / squash);
        } else if (e.kind === "wall") {
          v.group.position.set(e.x, 0, e.z);
        } else {
          v.group.position.set(e.x, 0.15, e.z);
        }
        if (e.hp !== v.lastHp) {
          v.lastHp = e.hp;
          const mat = v.sprite.material as THREE.SpriteMaterial;
          mat.map = hpTexture(e.kind, Math.max(0, e.hp));
          mat.needsUpdate = true;
        }
        const f = e.flash > 0 ? 0.65 : 0;
        for (const m of v.flashMats) m.emissive.setScalar(f);
      }
      for (const m of [eBody, eShadows]) {
        m.count = ei;
        m.instanceMatrix.needsUpdate = true;
      }
      for (const m of [eEyes, ePupils, eHorns]) {
        m.count = ei * 2;
        m.instanceMatrix.needsUpdate = true;
      }
      if (eBody.instanceColor) eBody.instanceColor.needsUpdate = true;
      for (const [id, v] of views) {
        if (!seen.has(id)) removeView(id, v);
      }

      // ── 장벽(게이트) ──
      const seenGates = new Set<number>();
      for (const g of state.gates) {
        seenGates.add(g.id);
        let gv = gateViews.get(g.id);
        if (!gv) {
          gv = createGateView(g.left, g.right);
          gateViews.set(g.id, gv);
        }
        gv.group.position.set(0, 0, g.z);
        if (g.used) {
          for (const m of gv.mats) m.opacity = Math.min(m.opacity, 0.25);
          for (const sp of gv.sprites) sp.visible = false;
        }
      }
      for (const [id, gv] of gateViews) {
        if (!seenGates.has(id)) removeGateView(id, gv);
      }

      // ── 총알 + 궤적 ──
      const nb = Math.min(state.bullets.length, MAX_BULLETS);
      for (let i = 0; i < nb; i++) {
        const b = state.bullets[i];
        setInstance(bullets, i, b.x, 0.7, b.z, 0.2, 0.2, 0.2);
        setInstance(trails, i, b.x, 0.7, b.z, 1, 1, 3.2);
      }
      bullets.count = nb;
      trails.count = nb;
      bullets.instanceMatrix.needsUpdate = true;
      trails.instanceMatrix.needsUpdate = true;

      // ── 파편 ──
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max) {
          particles.splice(i, 1);
          continue;
        }
        p.vy -= 14 * dt;
        p.x += p.vx * dt;
        p.y = Math.max(0.05, p.y + p.vy * dt);
        p.z += p.vz * dt;
      }
      let pi = 0;
      for (const p of particles) {
        if (pi >= MAX_PARTICLES) break;
        const k = 1 - p.life / p.max;
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.setScalar(p.size * (0.4 + k));
        dummy.rotation.set(p.life * 8, p.life * 6, 0);
        dummy.updateMatrix();
        particleMesh.setMatrixAt(pi, dummy.matrix);
        particleMesh.setColorAt(pi, tmpColor.setHex(p.color));
        pi++;
      }
      particleMesh.count = pi;
      particleMesh.instanceMatrix.needsUpdate = true;
      if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;

      // ── 팝업 숫자 ──
      for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.life += dt;
        if (p.life > 0.9) {
          scene.remove(p.sprite);
          (p.sprite.material as THREE.SpriteMaterial).dispose();
          popups.splice(i, 1);
          continue;
        }
        const k = p.life / 0.9;
        p.sprite.position.set(p.x, 2.4 + k * 1.6, p.z);
        (p.sprite.material as THREE.SpriteMaterial).opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        const s = 1 + Math.sin(Math.min(1, k * 3) * Math.PI) * 0.25;
        p.sprite.scale.set(2 * s, 1 * s, 1);
      }

      // ── 레벨업 링 ──
      if (ringT < 1) {
        ringT += dt * 1.6;
        ring.visible = true;
        ring.position.x = state.player.x;
        const s = 0.6 + ringT * 6;
        ring.scale.set(s, s, s);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 * (1 - ringT));
      } else {
        ring.visible = false;
      }

      // ── 카메라: 낮게 붙어서 따라가며 속도감을 줍니다 ──
      const px = state.player.x;
      const shake = kick * 0.14;
      const targetFov = running ? 5 : 0;
      speedFov += (targetFov - speedFov) * Math.min(1, dt * 3);
      fitCamera();
      // 레퍼런스처럼 높이 떠서 가깝게 내려다보는 시점 (병력이 늘면 조금 뒤로 물러나 전체가 보이게)
      const camZ = 7.6 + Math.max(0, rows - 1) * 0.5;
      camera.position.set(
        px * 0.6 + (Math.random() - 0.5) * shake,
        8.0 + kick * 0.3 + Math.max(0, rows - 1) * 0.3 + (Math.random() - 0.5) * shake,
        camZ
      );
      camera.lookAt(px * 0.4, 0.3, -7);

      renderer.render(scene, camera);
    },

    dispose() {
      for (const [id, v] of views) removeView(id, v);
      for (const [id, v] of gateViews) removeGateView(id, v);
      for (const p of popups) (p.sprite.material as THREE.SpriteMaterial).dispose();
      (squadLabel.material as THREE.SpriteMaterial).dispose();
      for (const t of textures.values()) t.dispose();
      textures.clear();
      for (const d of disposables) d.dispose();
      for (const m of [
        dashes,
        decor,
        clouds,
        bullets,
        trails,
        particleMesh,
        sBody,
        sHead,
        sEars,
        sStripes,
        sGun,
        eBody,
        eEyes,
        ePupils,
        eHorns,
        eShadows,
      ]) {
        m.dispose();
      }
      renderer.dispose();
    },
  };
}
