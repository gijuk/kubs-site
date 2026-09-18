import * as THREE from "three";
import {
  ROAD_HALF_WIDTH,
  type Entity,
  type ShooterEvent,
  type ShooterState,
} from "./shooterEngine";

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

/**
 * three.js 렌더러: ShooterState(게임 규칙)를 읽어 화면에 그리기만 합니다. 게임 규칙은 전혀 모릅니다.
 * 외부 3D 모델 없이 기본 geometry 조합으로 캐릭터/몬스터/구조물을 만들고,
 * 그림자 맵 없이 Lambert 재질만 써서 모바일에서도 가볍게 돕니다.
 */

export interface ShooterRenderer {
  resize(width: number, height: number): void;
  render(state: ShooterState, dt: number): void;
  dispose(): void;
}

const SKY = 0x8fd6ff;
const MAX_BULLETS = 260;
const MAX_PARTICLES = 160;
const DASH_ROWS = 15;
const DASH_SPACING = 8;
const DECOR_PER_SIDE = 22;
const DECOR_SPACING = 7;
const CLOUD_COUNT = 9;

const DECOR_COLORS = [0xff9eb5, 0xffd166, 0x7ee0c3, 0x8ab6ff, 0xc6a4ff];
const WALL_COLORS = [0xffb26b, 0x6fd6c0, 0xff8fb1, 0x8fb4ff];

interface EntityView {
  group: THREE.Group;
  sprite: THREE.Sprite;
  flashMats: THREE.MeshLambertMaterial[];
  lastHp: number;
  kind: Entity["kind"];
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
  scene.fog = new THREE.Fog(SKY, 38, 105);

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

  const sphereGeo = track(new THREE.SphereGeometry(1, 16, 12));
  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const coneGeo = track(new THREE.ConeGeometry(1, 1, 10));
  const cylGeo = track(new THREE.CylinderGeometry(1, 1, 1, 10));
  const white = track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const black = track(new THREE.MeshBasicMaterial({ color: 0x1d1b26 }));
  const orange = track(new THREE.MeshLambertMaterial({ color: 0xff9a3c }));
  const orangeDark = track(new THREE.MeshLambertMaterial({ color: 0xe57a1f }));
  const stripe = track(new THREE.MeshLambertMaterial({ color: 0x2b1b12 }));
  const cream = track(new THREE.MeshLambertMaterial({ color: 0xfff1d6 }));
  const gray = track(new THREE.MeshLambertMaterial({ color: 0x6b7280 }));
  const glowTip = track(new THREE.MeshBasicMaterial({ color: 0x7df9ff }));
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

  // ── 도로 ──
  const roadMat = track(new THREE.MeshLambertMaterial({ color: 0xe6ebf2 }));
  const road = mesh(boxGeo, roadMat, ROAD_HALF_WIDTH * 2 + 0.4, 0.5, 240, 0, -0.25, -100);
  scene.add(road);
  const edgeMat = track(new THREE.MeshLambertMaterial({ color: 0xdfe5ee }));
  for (const side of [-1, 1]) {
    scene.add(mesh(boxGeo, edgeMat, 0.5, 0.7, 240, side * (ROAD_HALF_WIDTH + 0.45), -0.1, -100));
  }

  // 차선 점선 (스크롤)
  const dashCols = [-2.4, -0.8, 0.8, 2.4];
  const dashes = new THREE.InstancedMesh(
    boxGeo,
    track(new THREE.MeshLambertMaterial({ color: 0xffffff })),
    dashCols.length * DASH_ROWS
  );
  scene.add(dashes);

  // 도로 옆 알록달록 블록 (스크롤) — 속도감을 줍니다
  const decor = new THREE.InstancedMesh(
    boxGeo,
    track(new THREE.MeshLambertMaterial({ color: 0xffffff })),
    DECOR_PER_SIDE * 2
  );
  const tmpColor = new THREE.Color();
  for (let i = 0; i < DECOR_PER_SIDE * 2; i++) {
    decor.setColorAt(i, tmpColor.setHex(DECOR_COLORS[i % DECOR_COLORS.length]));
  }
  scene.add(decor);

  // 구름
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

  const dummy = new THREE.Object3D();
  /** 음수도 안전한 나머지 (0 이상 m 미만) */
  const wrap = (v: number, m: number) => ((v % m) + m) % m;

  // 은은한 동그란 바닥 그림자 (그림자 맵 없이 가볍게)
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

  // ── 플레이어 (귀여운 호랑이) ──
  const player = new THREE.Group();
  const playerBody = mesh(sphereGeo, orange, 0.52, 0.55, 0.47, 0, 0.62, 0);
  player.add(playerBody);
  player.add(mesh(sphereGeo, cream, 0.34, 0.3, 0.2, 0, 0.5, -0.32)); // 배(앞)
  for (let i = 0; i < 3; i++) {
    // 등 줄무늬 (카메라에서 보이는 뒷면)
    player.add(mesh(boxGeo, stripe, 0.62 - i * 0.1, 0.08, 0.05, 0, 0.5 + i * 0.2, 0.42 - i * 0.03));
  }
  const head = new THREE.Group();
  head.position.set(0, 1.32, 0);
  head.add(mesh(sphereGeo, orange, 0.44, 0.4, 0.4, 0, 0, 0));
  head.add(mesh(sphereGeo, orange, 0.14, 0.14, 0.09, -0.3, 0.33, 0)); // 귀
  head.add(mesh(sphereGeo, orange, 0.14, 0.14, 0.09, 0.3, 0.33, 0));
  head.add(mesh(boxGeo, stripe, 0.09, 0.22, 0.05, -0.12, 0.12, 0.36)); // 머리 뒤 줄무늬
  head.add(mesh(boxGeo, stripe, 0.09, 0.22, 0.05, 0.12, 0.12, 0.36));
  head.add(mesh(boxGeo, stripe, 0.09, 0.2, 0.05, 0, 0.13, 0.38));
  player.add(head);
  const tail = new THREE.Group();
  tail.position.set(0, 0.55, 0.42);
  tail.add(mesh(cylGeo, orange, 0.1, 0.75, 0.1, 0, 0.36, 0.04));
  tail.add(mesh(sphereGeo, stripe, 0.13, 0.13, 0.13, 0, 0.78, 0.05));
  tail.add(mesh(boxGeo, stripe, 0.22, 0.07, 0.07, 0, 0.5, 0.05));
  tail.rotation.x = 0.3;
  player.add(tail);
  player.add(mesh(sphereGeo, orangeDark, 0.14, 0.11, 0.17, -0.2, 0.1, 0.05)); // 발
  player.add(mesh(sphereGeo, orangeDark, 0.14, 0.11, 0.17, 0.2, 0.1, 0.05));
  const gun = new THREE.Group();
  gun.position.set(0.42, 0.8, -0.4);
  gun.add(mesh(boxGeo, gray, 0.17, 0.17, 0.7, 0, 0, 0));
  gun.add(mesh(boxGeo, gray, 0.12, 0.26, 0.14, 0, -0.16, 0.2));
  gun.add(mesh(sphereGeo, glowTip, 0.09, 0.09, 0.09, 0, 0, -0.38));
  player.add(gun);
  player.add(blobShadow(0.75));
  player.scale.setScalar(1.3);
  scene.add(player);

  const muzzle = new THREE.Mesh(
    sphereGeo,
    track(
      new THREE.MeshBasicMaterial({
        color: 0xfff3a0,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
  );
  muzzle.visible = false;
  scene.add(muzzle);

  // ── 총알 + 궤적(trail) ──
  const bulletMat = track(new THREE.MeshBasicMaterial({ color: 0xfff36b }));
  const bullets = new THREE.InstancedMesh(sphereGeo, bulletMat, MAX_BULLETS);
  bullets.frustumCulled = false;
  scene.add(bullets);
  const trailGeo = track(new THREE.BoxGeometry(0.11, 0.11, 1));
  trailGeo.translate(0, 0, 0.5); // 총알 뒤(+z)쪽으로 길게 뻗도록
  const trails = new THREE.InstancedMesh(
    trailGeo,
    track(
      new THREE.MeshBasicMaterial({
        color: 0xffc933,
        transparent: true,
        opacity: 0.5,
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
  ring.position.y = 0.06;
  ring.visible = false;
  scene.add(ring);
  let ringT = 1;

  // ── HP 숫자 스프라이트 (숫자별 텍스처를 캐시해 재사용) ──
  const hpTextures = new Map<string, THREE.CanvasTexture>();
  function hpTexture(kind: Entity["kind"], hp: number): THREE.CanvasTexture {
    const key = `${kind}:${hp}`;
    const cached = hpTextures.get(key);
    if (cached) return cached;
    const c = document.createElement("canvas");
    c.width = 160;
    c.height = 80;
    const g = c.getContext("2d")!;
    const fill = kind === "boss" ? "#ff6b7a" : kind === "wall" ? "#ffd166" : "#ffffff";
    g.fillStyle = fill;
    g.strokeStyle = "#2b2f3a";
    g.lineWidth = 6;
    pillPath(g, 6, 8, 148, 64, 26);
    g.fill();
    g.stroke();
    g.fillStyle = kind === "boss" ? "#ffffff" : "#2b2f3a";
    g.font = "900 46px 'Arial Black', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (kind === "boss") {
      g.lineWidth = 6;
      g.strokeStyle = "#2b2f3a";
      g.strokeText(String(hp), 80, 42);
    }
    g.fillText(String(hp), 80, 42);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    hpTextures.set(key, tex);
    return tex;
  }

  // ── 적/구조물 뷰 ──
  const views = new Map<number, EntityView>();

  function buildMonster(boss: boolean): { group: THREE.Group; mats: THREE.MeshLambertMaterial[] } {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: boss ? 0xff5c6c : 0xa46bf5 });
    const limbMat = new THREE.MeshLambertMaterial({ color: boss ? 0xd8404f : 0x8b52e0 });
    group.add(mesh(sphereGeo, bodyMat, 0.62, 0.58, 0.6, 0, 0.62, 0));
    group.add(mesh(sphereGeo, white, 0.17, 0.2, 0.1, -0.24, 0.78, 0.52)); // 눈
    group.add(mesh(sphereGeo, white, 0.17, 0.2, 0.1, 0.24, 0.78, 0.52));
    group.add(mesh(sphereGeo, black, 0.075, 0.09, 0.05, -0.24, 0.76, 0.6));
    group.add(mesh(sphereGeo, black, 0.075, 0.09, 0.05, 0.24, 0.76, 0.6));
    group.add(mesh(boxGeo, black, 0.3, 0.07, 0.05, 0, 0.5, 0.58)); // 입
    if (boss) {
      // 왕관
      for (const dx of [-0.32, 0, 0.32]) {
        group.add(mesh(coneGeo, gold, 0.12, 0.34, 0.12, dx, 1.42, 0));
      }
    } else {
      group.add(mesh(coneGeo, gold, 0.1, 0.28, 0.1, -0.3, 1.2, 0.05)); // 뿔
      group.add(mesh(coneGeo, gold, 0.1, 0.28, 0.1, 0.3, 1.2, 0.05));
    }
    group.add(mesh(sphereGeo, limbMat, 0.14, 0.14, 0.14, -0.62, 0.55, 0.15)); // 팔
    group.add(mesh(sphereGeo, limbMat, 0.14, 0.14, 0.14, 0.62, 0.55, 0.15));
    group.add(mesh(sphereGeo, limbMat, 0.17, 0.1, 0.2, -0.28, 0.08, 0.1)); // 발
    group.add(mesh(sphereGeo, limbMat, 0.17, 0.1, 0.2, 0.28, 0.08, 0.1));
    group.add(blobShadow(0.85));
    return { group, mats: [bodyMat, limbMat] };
  }

  function buildWall(e: Entity): { group: THREE.Group; mats: THREE.MeshLambertMaterial[] } {
    const group = new THREE.Group();
    const color = WALL_COLORS[Math.floor(e.seed * WALL_COLORS.length) % WALL_COLORS.length];
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const capMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    group.add(mesh(boxGeo, bodyMat, e.w, e.h, e.d, 0, e.h / 2, 0));
    group.add(mesh(boxGeo, capMat, e.w + 0.08, 0.16, e.d + 0.08, 0, e.h + 0.08, 0));
    // 벽돌 느낌의 가로줄
    const lineMat = new THREE.MeshLambertMaterial({ color: 0x000000, transparent: true, opacity: 0.12 });
    group.add(mesh(boxGeo, lineMat, e.w + 0.02, 0.05, e.d + 0.02, 0, e.h * 0.35, 0));
    group.add(mesh(boxGeo, lineMat, e.w + 0.02, 0.05, e.d + 0.02, 0, e.h * 0.68, 0));
    return { group, mats: [bodyMat, capMat] };
  }

  function createView(e: Entity): EntityView {
    const built =
      e.kind === "wall" ? buildWall(e) : buildMonster(e.kind === "boss");
    if (e.kind === "boss") built.group.scale.setScalar(2.6);

    const spriteMat = new THREE.SpriteMaterial({
      map: hpTexture(e.kind, e.hp),
      depthTest: false,
      fog: false,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.renderOrder = 20;
    const sx = e.kind === "boss" ? 3.3 : e.kind === "wall" ? 1.8 : 1.5;
    sprite.scale.set(sx, sx / 2, 1);
    sprite.position.y = e.kind === "boss" ? e.h + 0.9 : e.h + (e.kind === "wall" ? 0.7 : 0.6);
    // 스프라이트는 그룹 스케일(보스 2.6배)의 영향을 받지 않게 별도 그룹에 둡니다.
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
        max: 0.45 + Math.random() * 0.35,
        size: 0.12 + Math.random() * 0.12,
        color: colors[i % colors.length],
      });
    }
  }

  let kick = 0;
  let scroll = 0;
  let time = 0;
  let muzzleT = 1;
  let aspect = 9 / 16;

  function handleEvents(events: ShooterEvent[], state: ShooterState) {
    for (const ev of events) {
      switch (ev.type) {
        case "shoot":
          muzzleT = 0;
          break;
        case "hit":
          burst(ev.x, 0.9, ev.z, 3, [0xfff36b, 0xffffff], 3);
          break;
        case "kill": {
          const cols =
            ev.kind === "wall"
              ? [0xffd166, 0xffffff, 0xb0b8c8]
              : ev.kind === "boss"
              ? [0xff5c6c, 0xffd84d, 0xffffff]
              : [0xa46bf5, 0xffe066, 0xffffff];
          burst(ev.x, 0.9, ev.z, ev.kind === "boss" ? 40 : 16, cols, ev.kind === "boss" ? 7 : 5);
          break;
        }
        case "levelUp":
          ringT = 0;
          kick = 1;
          break;
        case "gameOver":
          kick = 1.4;
          break;
        default:
          break;
      }
    }
    void state;
  }

  function fitCamera() {
    // 가로로 항상 같은 폭(도로 전체)이 보이도록 세로 시야각을 화면 비율에 맞춰 계산합니다.
    const hFov = (56 * Math.PI) / 180;
    const vFov = 2 * Math.atan(Math.tan(hFov / 2) / aspect);
    camera.fov = Math.min(84, Math.max(38, (vFov * 180) / Math.PI));
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
      kick = Math.max(0, kick - dt * 2.2);
      handleEvents(state.events, state);

      // 도로 스크롤: 플레이 중에는 실제 이동 거리를, 대기 화면에서는 천천히 자동 스크롤
      scroll = state.phase === "ready" ? scroll + dt * 2.5 : state.phase === "playing" ? state.distance : scroll;

      // 차선 점선
      let di = 0;
      const dashSpan = DASH_ROWS * DASH_SPACING;
      for (const cx of dashCols) {
        for (let r = 0; r < DASH_ROWS; r++) {
          const z = 12 - wrap(r * DASH_SPACING - scroll, dashSpan);
          dummy.position.set(cx, 0.01, z);
          dummy.scale.set(0.14, 0.02, 2.4);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          dashes.setMatrixAt(di++, dummy.matrix);
        }
      }
      dashes.instanceMatrix.needsUpdate = true;

      // 길가 블록
      const decorSpan = DECOR_PER_SIDE * DECOR_SPACING;
      let ci = 0;
      for (const side of [-1, 1]) {
        for (let r = 0; r < DECOR_PER_SIDE; r++) {
          const z = 12 - wrap(r * DECOR_SPACING - scroll, decorSpan);
          const tall = 0.8 + ((r * 7 + (side > 0 ? 3 : 0)) % 4) * 0.35;
          dummy.position.set(side * (ROAD_HALF_WIDTH + 1.25), tall / 2 - 0.1, z);
          dummy.scale.set(0.8, tall, 0.8);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          decor.setMatrixAt(ci++, dummy.matrix);
        }
      }
      decor.instanceMatrix.needsUpdate = true;

      // 구름 (느리게 스크롤)
      let cli = 0;
      for (const c of cloudSeeds) {
        const span = 190;
        const z = 20 - wrap(20 - c.z - scroll * 0.35, span);
        for (let k = 0; k < 3; k++) {
          dummy.position.set(c.x + (k - 1) * c.s * 0.9, c.y + (k === 1 ? 0.5 : 0), z);
          dummy.scale.set(c.s * (k === 1 ? 1.1 : 0.8), c.s * 0.55, c.s * 0.8);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          clouds.setMatrixAt(cli++, dummy.matrix);
        }
      }
      clouds.instanceMatrix.needsUpdate = true;

      // 플레이어
      const running = state.phase === "playing";
      const bob = running ? Math.abs(Math.sin(time * 12)) * 0.07 : Math.sin(time * 2.5) * 0.02;
      player.position.set(state.player.x, bob, 0);
      player.rotation.z = running ? -state.input.moveDir * 0.12 : 0;
      tail.rotation.z = Math.sin(time * 9) * 0.35;
      head.rotation.y = Math.sin(time * 3) * 0.05;
      const leanTarget = running ? -state.input.moveDir * 0.15 : 0;
      playerBody.rotation.z += (leanTarget - playerBody.rotation.z) * Math.min(1, dt * 10);

      // 총구 번쩍임
      muzzleT += dt * 9;
      if (muzzleT < 1) {
        muzzle.visible = true;
        muzzle.position.set(state.player.x + 0.55, 1.04 + bob, -1.0);
        const s = 0.28 * (1 - muzzleT) + 0.05;
        muzzle.scale.set(s, s, s);
      } else {
        muzzle.visible = false;
      }

      // 적/구조물 동기화
      const seen = new Set<number>();
      for (const e of state.entities) {
        seen.add(e.id);
        let v = views.get(e.id);
        if (!v) {
          v = createView(e);
          views.set(e.id, v);
        }
        const wob = e.kind === "wall" ? 0 : Math.abs(Math.sin(time * (e.kind === "boss" ? 3 : 7) + e.seed * 10));
        v.group.position.set(e.x, wob * (e.kind === "boss" ? 0.25 : 0.12), e.z);
        if (e.kind !== "wall") {
          const squash = 1 + Math.sin(time * 7 + e.seed * 10) * 0.05;
          v.group.scale.set(1 / squash, squash, 1 / squash);
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
      for (const [id, v] of views) {
        if (!seen.has(id)) removeView(id, v);
      }

      // 총알 + 궤적
      const n = Math.min(state.bullets.length, MAX_BULLETS);
      for (let i = 0; i < n; i++) {
        const b = state.bullets[i];
        dummy.position.set(b.x, 1.0, b.z);
        dummy.scale.set(0.28, 0.28, 0.28);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        bullets.setMatrixAt(i, dummy.matrix);

        dummy.position.set(b.x, 1.0, b.z);
        dummy.scale.set(1.5, 1.5, 3.4);
        dummy.rotation.set(0, Math.atan2(-b.vx, -b.vz), 0);
        dummy.updateMatrix();
        trails.setMatrixAt(i, dummy.matrix);
      }
      bullets.count = n;
      trails.count = n;
      bullets.instanceMatrix.needsUpdate = true;
      trails.instanceMatrix.needsUpdate = true;

      // 파편
      let pi = 0;
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

      // 레벨업 링
      if (ringT < 1) {
        ringT += dt * 1.6;
        ring.visible = true;
        ring.position.x = state.player.x;
        const s = 0.6 + ringT * 5.5;
        ring.scale.set(s, s, s);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 * (1 - ringT));
      } else {
        ring.visible = false;
      }

      // 카메라: 플레이어 뒤에서 살짝 위에서 내려다보며 따라감
      const px = state.player.x;
      const shake = kick * 0.12;
      camera.position.set(
        px * 0.6 + (Math.random() - 0.5) * shake,
        6.9 + kick * 0.3 + (Math.random() - 0.5) * shake,
        8.4
      );
      camera.lookAt(px * 0.4, 0.5, -9);

      renderer.render(scene, camera);
    },

    dispose() {
      for (const [id, v] of views) removeView(id, v);
      for (const t of hpTextures.values()) t.dispose();
      hpTextures.clear();
      for (const d of disposables) d.dispose();
      dashes.dispose();
      decor.dispose();
      clouds.dispose();
      bullets.dispose();
      trails.dispose();
      particleMesh.dispose();
      renderer.dispose();
    },
  };
}
