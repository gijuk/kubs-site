import * as THREE from "three";
import {
  BULLET_RANGE,
  ROAD_HALF_WIDTH,
  SLOT_DZ,
  SQUAD_MAX,
  formation,
  squadHalfWidth,
  type Entity,
  type ShooterEvent,
  type ShooterState,
} from "./shooterEngine";
import { BOSS_KIT, BRUTE_KIT, GRUNT_KIT, RUNNER_KIT, SPITTER_KIT, TIGER_KIT, type Part } from "./shooterModels";

/**
 * three.js 렌더러: ShooterState(게임 규칙)를 읽어 화면에 그리기만 합니다.
 * 캐릭터/몬스터는 외부 모델 없이 기본 geometry를 부위별로 조합한 "키트"(shooterModels.ts)로 만들고,
 * 부위마다 InstancedMesh 하나씩만 써서 많은 개체를 적은 draw call로 그립니다.
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
const MAX_BULLETS = 620;
const MAX_MUZZLE = 96;
const MAX_PARTICLES = 420;
const MAX_SHOTS = 48;
const MAX_ENEMY = 200;
const MAX_SPEEDLINES = 34;
const DASH_ROWS = 15;
const DASH_SPACING = 8;
const DECOR_PER_SIDE = 22;
const DECOR_SPACING = 7;
const CLOUD_COUNT = 9;
/** 병력 캐릭터를 크게 (몰입감) */
const TIGER_SCALE = 1.55;

const DECOR_COLORS = [0xff9eb5, 0xffd166, 0x7ee0c3, 0x8ab6ff, 0xc6a4ff];
const WALL_COLORS = [0xffb26b, 0x6fd6c0, 0xff8fb1, 0x8fb4ff];

interface EntityView {
  group: THREE.Group;
  shield?: THREE.Mesh;
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

interface Kit {
  parts: Part[];
  meshes: THREE.InstancedMesh[];
  colors: THREE.Color[];
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
  const geos = { sphere: sphereGeo, box: boxGeo, cone: coneGeo, cyl: cylGeo };
  const white = new THREE.Color(0xffffff);

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

  // ── 부위별 키트(InstancedMesh 묶음) ──
  function makeKit(parts: Part[], cap: number): Kit {
    const meshes: THREE.InstancedMesh[] = [];
    const colors: THREE.Color[] = [];
    for (const pt of parts) {
      const mat = track(
        pt.glow
          ? new THREE.MeshBasicMaterial({ color: 0xffffff })
          : new THREE.MeshLambertMaterial({ color: 0xffffff })
      );
      const im = new THREE.InstancedMesh(geos[pt.g], mat, cap);
      im.frustumCulled = false;
      im.count = 0;
      for (let i = 0; i < cap; i++) im.setColorAt(i, white);
      scene.add(im);
      meshes.push(im);
      colors.push(new THREE.Color(pt.c));
    }
    return { parts, meshes, colors };
  }

  /**
   * 키트 한 개체를 i번째 인스턴스로 그립니다.
   * k = 크기 배율, t = 걷기/흔들림 위상, flash = 피격 시 하얗게 번쩍
   */
  function drawKit(kit: Kit, i: number, x: number, y: number, z: number, k: number, t: number, flash: boolean) {
    const { parts, meshes, colors } = kit;
    for (let j = 0; j < parts.length; j++) {
      const pt = parts[j];
      let px = pt.p[0] * k;
      let py = pt.p[1] * k;
      let pz = pt.p[2] * k;
      let rx = pt.rx ?? 0;
      if (pt.swing) {
        const sw = Math.sin(t + (pt.ph ?? 0)) * pt.swing;
        pz += sw * k * 0.45;
        rx += sw * 0.8;
      }
      if (pt.wag) px += Math.sin(t * 0.6 + (pt.ph ?? 0)) * pt.wag * k;
      dummy.position.set(x + px, y + py, z + pz);
      dummy.rotation.set(rx, 0, pt.rz ?? 0);
      dummy.scale.set(pt.s[0] * k, pt.s[1] * k, pt.s[2] * k);
      dummy.updateMatrix();
      meshes[j].setMatrixAt(i, dummy.matrix);
      meshes[j].setColorAt(i, flash && !pt.keep ? white : colors[j]);
    }
  }

  function finishKit(kit: Kit, count: number) {
    for (const m of kit.meshes) {
      m.count = count;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
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

  // 속도선: 카메라 쪽으로 빠르게 스쳐 지나가는 가느다란 빛줄기 (속도감)
  const speedLines = new THREE.InstancedMesh(
    boxGeo,
    track(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    ),
    MAX_SPEEDLINES
  );
  speedLines.frustumCulled = false;
  scene.add(speedLines);
  const lineSeeds = Array.from({ length: MAX_SPEEDLINES }, (_, i) => ({
    x: (((i * 7919) % 100) / 100) * 15 - 7.5,
    y: 0.4 + (((i * 104729) % 100) / 100) * 3.4,
    z: (((i * 1299709) % 100) / 100) * 60,
    len: 2 + (((i * 15485863) % 100) / 100) * 3,
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

  // ── 캐릭터/몬스터 키트 ──
  const SQ = SQUAD_MAX + 4;
  const tigerKit = makeKit(TIGER_KIT, SQ);
  const gruntKit = makeKit(GRUNT_KIT, MAX_ENEMY);
  const runnerKit = makeKit(RUNNER_KIT, MAX_ENEMY);
  const bruteKit = makeKit(BRUTE_KIT, 24);
  const spitterKit = makeKit(SPITTER_KIT, 24);
  const bossKit = makeKit(BOSS_KIT, 2);
  const kits = [tigerKit, gruntKit, runnerKit, bruteKit, spitterKit, bossKit];

  const eShadows = new THREE.InstancedMesh(shadowGeo, shadowMat, MAX_ENEMY + 48);
  eShadows.frustumCulled = false;
  scene.add(eShadows);

  const sx = new Float32Array(SQ);
  const sz = new Float32Array(SQ);
  const born = new Float32Array(SQ);
  let prevSquad = 0;

  // ── 총알 + 궤적 + 총구 섬광 ──
  const bullets = new THREE.InstancedMesh(
    sphereGeo,
    track(new THREE.MeshBasicMaterial({ color: 0xfff36b })),
    MAX_BULLETS
  );
  bullets.frustumCulled = false;
  scene.add(bullets);
  const trailGeo = track(new THREE.BoxGeometry(0.11, 0.11, 1));
  trailGeo.translate(0, 0, 0.5);
  const trails = new THREE.InstancedMesh(
    trailGeo,
    track(
      new THREE.MeshBasicMaterial({
        color: 0xffb830,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    ),
    MAX_BULLETS
  );
  trails.frustumCulled = false;
  scene.add(trails);
  const muzzle = new THREE.InstancedMesh(
    sphereGeo,
    track(
      new THREE.MeshBasicMaterial({
        color: 0xffe27a,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    ),
    MAX_MUZZLE
  );
  muzzle.frustumCulled = false;
  scene.add(muzzle);

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

  // ── 보스/원거리 적 투사체 (빨간 구슬, 총알로 격추 가능) ──
  const shotMesh = new THREE.InstancedMesh(
    sphereGeo,
    track(new THREE.MeshBasicMaterial({ color: 0xff4d5e })),
    MAX_SHOTS
  );
  const shotGlow = new THREE.InstancedMesh(
    sphereGeo,
    track(
      new THREE.MeshBasicMaterial({
        color: 0xff9aa6,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    ),
    MAX_SHOTS
  );
  for (const m of [shotMesh, shotGlow]) {
    m.frustumCulled = false;
    scene.add(m);
  }

  // ── 레벨업 링 / 기둥 폭발 충격파 ──
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

  const blast = new THREE.Mesh(
    track(new THREE.RingGeometry(0.8, 1, 48)),
    track(
      new THREE.MeshBasicMaterial({
        color: 0xffb13d,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
  );
  blast.rotation.x = -Math.PI / 2;
  blast.position.y = 0.08;
  blast.visible = false;
  scene.add(blast);
  let blastT = 1;
  let blastX = 0;
  let blastZ = 0;
  let blastR = 7;

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
      g.fillStyle = kind === "boss" ? "#ff6b7a" : kind === "wall" || kind === "pillar" ? "#ffd166" : "#ffffff";
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

  const squadLabel = makeSprite(squadTexture(SQUAD_MAX), 1.3, 0.65);
  scene.add(squadLabel);
  let lastSquadLabel = -1;

  // ── 벽/기둥/보스/정예 라벨 뷰 (몸은 키트로 그리고, 벽·기둥만 자체 모델) ──
  const views = new Map<number, EntityView>();

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

  /** 큰 기둥: 뒤에 숨은 적들을 지키는 탑. 부수면 폭발합니다. */
  function buildPillar(e: Entity): { group: THREE.Group; mats: THREE.MeshLambertMaterial[] } {
    const group = new THREE.Group();
    const stone = new THREE.MeshLambertMaterial({ color: 0xd9dfea });
    const band = new THREE.MeshLambertMaterial({ color: 0xff5a63 });
    const w = e.w;
    group.add(mesh(cylGeo, stone, w * 0.5, e.h, w * 0.5, 0, e.h / 2, 0));
    group.add(mesh(cylGeo, stone, w * 0.62, 0.35, w * 0.62, 0, 0.18, 0));
    for (const y of [0.35, 0.62]) {
      group.add(mesh(cylGeo, band, w * 0.53, 0.32, w * 0.53, 0, e.h * y, 0));
    }
    group.add(mesh(cylGeo, stone, w * 0.66, 0.4, w * 0.66, 0, e.h + 0.2, 0));
    group.add(mesh(sphereGeo, band, 0.4, 0.4, 0.4, 0, e.h + 0.65, 0));
    group.add(blobShadow(w * 0.75));
    return { group, mats: [stone, band] };
  }

  function createView(e: Entity): EntityView {
    let built: { group: THREE.Group; mats: THREE.MeshLambertMaterial[] };
    if (e.kind === "pillar") built = buildPillar(e);
    else if (e.kind === "wall") built = buildWall(e);
    else built = { group: new THREE.Group(), mats: [] }; // 정예/보스: 몸은 키트, 여기선 HP 라벨만

    const sprite = makeSprite(hpTexture(e.kind, e.hp), 1, 0.5);
    const sw = e.kind === "boss" ? 4 : e.kind === "pillar" ? 2.4 : e.kind === "wall" ? 2 : 1.7;
    sprite.scale.set(sw, sw / 2, 1);
    sprite.position.y = e.h + (e.kind === "boss" ? 0.8 : 0.6);

    const holder = new THREE.Group();
    holder.add(built.group);
    holder.add(sprite);
    let shield: THREE.Mesh | undefined;
    if (e.kind === "boss") {
      // 방어막 (스테이지 4+ 보스가 잠깐 무적이 될 때 나타남)
      shield = new THREE.Mesh(
        sphereGeo,
        new THREE.MeshBasicMaterial({
          color: 0x6bd0ff,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      shield.scale.set(4.6, 4.4, 4.4);
      shield.position.y = 2.6;
      shield.visible = false;
      holder.add(shield);
    }
    scene.add(holder);
    return { group: holder, shield, sprite, flashMats: built.mats, lastHp: e.hp, kind: e.kind };
  }

  function removeView(id: number, v: EntityView) {
    scene.remove(v.group);
    (v.sprite.material as THREE.SpriteMaterial).dispose();
    for (const m of v.flashMats) m.dispose();
    if (v.shield) (v.shield.material as THREE.Material).dispose();
    views.delete(id);
  }

  // ── 장벽(게이트) 뷰 ──
  const gateViews = new Map<number, GateView>();
  const postMat = track(new THREE.MeshLambertMaterial({ color: 0x2f7dff }));
  const postTopMat = track(new THREE.MeshLambertMaterial({ color: 0xffffff }));

  function createGateView(left: number | null, right: number | null): GateView {
    const group = new THREE.Group();
    const mats: THREE.MeshBasicMaterial[] = [];
    const sprites: THREE.Sprite[] = [];
    const half = ROAD_HALF_WIDTH + 0.2;
    for (const side of [-1, 1]) {
      const value = side < 0 ? left : right;
      if (value === null) continue; // 이쪽은 뚫려 있음 (몬스터 무리가 서 있는 쪽)
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
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
      mats.push(lineMat);
      for (const dz of [-1.0, 1.0]) {
        const line = new THREE.Mesh(boxGeo, lineMat);
        line.scale.set(half, 0.07, 0.08);
        line.position.set(side * (half / 2), 0.07, dz);
        group.add(line);
      }
      const text = value > 0 ? `+${value}` : String(value);
      const sp = makeSprite(bigNumberTexture(text, "#ffffff", good ? "#0b5ea8" : "#a3142a"), 2.6, 1.3);
      sp.position.set(side * (half / 2), 1.15, 0);
      group.add(sp);
      sprites.push(sp);
    }
    for (const px of [-half, 0, half]) {
      if (px < 0 && left === null) continue;
      if (px > 0 && right === null) continue;
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
    const sp = makeSprite(bigNumberTexture(text, "#ffffff", good ? "#0f9d58" : "#d92d45"), 1.2, 0.6);
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
  /** 총알이 맞을 때마다 쌓이는 미세한 화면 흔들림 (총 쏘는 손맛) */
  let impact = 0;
  let scroll = 0;
  let time = 0;
  let aspect = 9 / 16;
  let speedFov = 0;
  let hitsThisFrame = 0;

  function handleEvents(events: ShooterEvent[], state: ShooterState) {
    for (const ev of events) {
      switch (ev.type) {
        case "hit":
          hitsThisFrame++;
          burst(ev.x, 1.0, ev.z, 2, [0xfff36b, 0xffffff, 0xffb830], 4);
          impact = Math.min(0.7, impact + 0.05);
          break;
        case "kill": {
          const cols =
            ev.kind === "wall"
              ? [0xffd166, 0xffffff, 0xb0b8c8]
              : ev.kind === "boss"
              ? [0xff5c6c, 0xffd84d, 0xffffff]
              : ev.kind === "elite"
              ? [0xff6f8a, 0xffe066, 0xffffff]
              : ev.kind === "runner"
              ? [0xf29a2e, 0xffe066]
              : ev.kind === "spitter"
              ? [0x7d52c4, 0x7dff4a]
              : [0x5aa84a, 0xffe066, 0xff4a4a];
          const n = ev.kind === "boss" ? 46 : ev.kind === "wall" ? 16 : ev.kind === "elite" ? 16 : 6;
          burst(ev.x, 0.9, ev.z, n, cols, ev.kind === "boss" ? 7 : 5);
          impact = Math.min(0.9, impact + (ev.kind === "boss" ? 0.6 : ev.kind === "elite" ? 0.22 : 0.06));
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
        case "explode":
          burst(ev.x, 1.4, ev.z, 80, [0xffd84d, 0xff8a3c, 0xffffff, 0xff5a63], 10);
          blastT = 0;
          blastX = ev.x;
          blastZ = ev.z;
          blastR = ev.radius;
          kick = Math.max(kick, 1.9);
          break;
        case "bonus":
          spawnPopup(`+${ev.value}`, true, state.player.x, 0);
          break;
        case "stageClear":
          kick = Math.max(kick, 0.8);
          break;
        case "levelUp":
          ringT = 0;
          kick = Math.max(kick, 0.6);
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
    const hFov = (46 * Math.PI) / 180;
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
      impact *= Math.exp(-9 * dt);
      hitsThisFrame = 0;
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

      // 속도선 (달리는 중에만 보임)
      const running = state.phase === "playing";
      const lineCount = running ? MAX_SPEEDLINES : 0;
      for (let i = 0; i < lineCount; i++) {
        const l = lineSeeds[i];
        const z = 14 - wrap(l.z * 1.0 - scroll * 2.4, 66);
        setInstance(speedLines, i, l.x, l.y, z, 0.03, 0.03, l.len);
      }
      speedLines.count = lineCount;
      speedLines.instanceMatrix.needsUpdate = true;

      // ── 병력(호랑이 키트) ──
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
      for (let i = 0; i < n; i++) {
        const tx = state.player.x + slots[i].dx;
        const tz = slots[i].dz;
        sx[i] = snap ? tx : sx[i] + (tx - sx[i]) * follow;
        sz[i] = snap ? tz : sz[i] + (tz - sz[i]) * follow;
        const pop = Math.min(1, (time - born[i]) / 0.28);
        const k = (pop >= 1 ? 1 : pop * (1.25 - 0.25 * pop)) * TIGER_SCALE;
        const bob = running ? Math.abs(Math.sin(time * 14 + i * 1.7)) * 0.08 : Math.sin(time * 2.4 + i) * 0.015;
        // 총을 쏠 때 몸이 살짝 뒤로 밀리는 반동
        const recoil = running ? Math.max(0, Math.sin(time * 25.1 + i * 2.3)) * 0.02 : 0;
        drawKit(tigerKit, i, sx[i], bob, sz[i] + recoil, k, running ? time * 14 + i : time * 2 + i, false);
      }
      finishKit(tigerKit, n);

      // 분대 발밑 원 + 인원수 라벨
      const half = squadHalfWidth(Math.max(1, n));
      const rows = n > 0 ? Math.round(slots[n - 1].dz / SLOT_DZ) + 1 : 1;
      const ringR = half + 0.6;
      const ringZ = ((rows - 1) * SLOT_DZ) / 2;
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
      squadLabel.position.set(state.player.x, 3.2, ringZ);

      // ── 몬스터(키트) + 벽/기둥/정예/보스 라벨(뷰) ──
      const seen = new Set<number>();
      let cg = 0;
      let cr = 0;
      let cb = 0;
      let cs = 0;
      let cB = 0;
      let cShadow = 0;
      for (const e of state.entities) {
        const flash = e.flash > 0;
        const r = e.w / 2;
        const pop = flash ? 1.1 : 1;
        if (e.kind === "mob" && cg < MAX_ENEMY) {
          const bob = Math.abs(Math.sin(time * 10 + e.seed * 20)) * 0.12;
          drawKit(gruntKit, cg++, e.x, bob, e.z, r * pop, time * 10 + e.seed * 20, flash);
          shadowAt(cShadow++, e.x, e.z, r * 1.1);
        } else if (e.kind === "runner" && cr < MAX_ENEMY) {
          const bob = Math.abs(Math.sin(time * 16 + e.seed * 20)) * 0.1;
          drawKit(runnerKit, cr++, e.x, bob, e.z, r * pop, time * 18 + e.seed * 20, flash);
          shadowAt(cShadow++, e.x, e.z, r * 1.2);
        } else if (e.kind === "elite" && cb < 24) {
          const bob = Math.abs(Math.sin(time * 6 + e.seed * 20)) * 0.16;
          drawKit(bruteKit, cb++, e.x, bob, e.z, r * pop, time * 6 + e.seed * 20, flash);
          shadowAt(cShadow++, e.x, e.z, r * 1.1);
        } else if (e.kind === "spitter" && cs < 24) {
          const bob = Math.abs(Math.sin(time * 4 + e.seed * 20)) * 0.1;
          drawKit(spitterKit, cs++, e.x, bob, e.z, r * pop, time * 4 + e.seed * 20, flash);
          shadowAt(cShadow++, e.x, e.z, r * 1.1);
        } else if (e.kind === "boss" && cB < 2) {
          const wob = Math.abs(Math.sin(time * 3 + e.seed * 10)) * 0.25;
          drawKit(bossKit, cB++, e.x, wob, e.z, r * 0.62 * pop, time * 3, flash);
          shadowAt(cShadow++, e.x, e.z, r * 0.9);
        }

        if (e.kind === "mob" || e.kind === "runner" || e.kind === "spitter") continue;

        seen.add(e.id);
        let v = views.get(e.id);
        if (!v) {
          v = createView(e);
          views.set(e.id, v);
        }
        if (e.kind === "boss") {
          v.group.position.set(e.x, Math.abs(Math.sin(time * 3 + e.seed * 10)) * 0.25, e.z);
        } else if (e.kind === "wall" || e.kind === "pillar") {
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
        if (v.shield) {
          const on = (e.shield ?? 0) > 0;
          v.shield.visible = on;
          if (on) (v.shield.material as THREE.MeshBasicMaterial).opacity = 0.28 + Math.sin(time * 14) * 0.1;
        }
      }
      finishKit(gruntKit, cg);
      finishKit(runnerKit, cr);
      finishKit(bruteKit, cb);
      finishKit(spitterKit, cs);
      finishKit(bossKit, cB);
      eShadows.count = cShadow;
      eShadows.instanceMatrix.needsUpdate = true;
      for (const [id, v] of views) {
        if (!seen.has(id)) removeView(id, v);
      }

      function shadowAt(i: number, x: number, z: number, rad: number) {
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.position.set(x, 0.03, z);
        dummy.scale.set(rad, rad, rad);
        dummy.updateMatrix();
        eShadows.setMatrixAt(i, dummy.matrix);
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

      // ── 총알 + 궤적 + 총구 섬광 ──
      const nb = Math.min(state.bullets.length, MAX_BULLETS);
      let nm = 0;
      for (let i = 0; i < nb; i++) {
        const b = state.bullets[i];
        setInstance(bullets, i, b.x, 0.9, b.z, 0.26, 0.26, 0.26);
        setInstance(trails, i, b.x, 0.9, b.z, 1.4, 1.4, 3.6);
        // 막 발사된 총알에는 총구 섬광
        const travelled = b.endZ + BULLET_RANGE - b.z;
        if (travelled < 2.2 && nm < MAX_MUZZLE) {
          const f = 1 - travelled / 2.2;
          const s = 0.22 + f * 0.42;
          setInstance(muzzle, nm++, b.x, 0.9, b.z + 0.25, s, s, s * 1.4);
        }
      }
      bullets.count = nb;
      trails.count = nb;
      muzzle.count = nm;
      bullets.instanceMatrix.needsUpdate = true;
      trails.instanceMatrix.needsUpdate = true;
      muzzle.instanceMatrix.needsUpdate = true;

      // ── 적 투사체 ──
      const ns = Math.min(state.shots.length, MAX_SHOTS);
      for (let i = 0; i < ns; i++) {
        const sh = state.shots[i];
        const pulse = 1 + Math.sin(time * 18 + i) * 0.12;
        setInstance(shotMesh, i, sh.x, 1.0, sh.z, 0.42 * pulse, 0.42 * pulse, 0.42 * pulse);
        setInstance(shotGlow, i, sh.x, 1.0, sh.z, 0.85 * pulse, 0.85 * pulse, 0.85 * pulse);
      }
      shotMesh.count = ns;
      shotGlow.count = ns;
      shotMesh.instanceMatrix.needsUpdate = true;
      shotGlow.instanceMatrix.needsUpdate = true;

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
        p.sprite.position.set(p.x, 3.9 + k * 1.3, p.z);
        (p.sprite.material as THREE.SpriteMaterial).opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        const s = 1 + Math.sin(Math.min(1, k * 3) * Math.PI) * 0.25;
        p.sprite.scale.set(1.2 * s, 0.6 * s, 1);
      }

      // ── 레벨업 링 / 기둥 폭발 충격파 ──
      if (ringT < 1) {
        ringT += dt * 1.6;
        ring.visible = true;
        ring.position.x = state.player.x;
        const s = 0.6 + ringT * 4;
        ring.scale.set(s, s, s);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.6 * (1 - ringT));
      } else {
        ring.visible = false;
      }
      if (blastT < 1) {
        blastT += dt * 2.2;
        blast.visible = true;
        blast.position.set(blastX, 0.08, blastZ);
        const bs = 1 + blastT * blastR;
        blast.scale.set(bs, bs, bs);
        (blast.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - blastT));
      } else {
        blast.visible = false;
      }

      // ── 카메라: 높이 떠서 가깝게 내려다보며, 사격 임팩트에 따라 미세하게 흔들림 ──
      const px = state.player.x;
      const shake = kick * 0.14 + impact * 0.075;
      const targetFov = running ? 7 : 0;
      speedFov += (targetFov - speedFov) * Math.min(1, dt * 3);
      fitCamera();
      const camZ = 7.8 + Math.max(0, rows - 1) * 0.6;
      camera.position.set(
        px * 0.6 + (Math.random() - 0.5) * shake,
        8.2 + kick * 0.3 + Math.max(0, rows - 1) * 0.32 + (Math.random() - 0.5) * shake,
        camZ + (Math.random() - 0.5) * impact * 0.05
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
      for (const k of kits) for (const m of k.meshes) m.dispose();
      for (const m of [
        dashes,
        decor,
        clouds,
        speedLines,
        bullets,
        trails,
        muzzle,
        particleMesh,
        shotMesh,
        shotGlow,
        eShadows,
      ]) {
        m.dispose();
      }
      renderer.dispose();
    },
  };
}
