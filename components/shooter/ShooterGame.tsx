"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_LEVEL,
  STAGE_LENGTH,
  createState,
  expToNext,
  startGame,
  update,
  type ShooterState,
} from "./shooterEngine";
import type { ShooterRenderer } from "./shooterRenderer";

const BEST_KEY = "kubs-shooter-best";
/** 화면 가로 전체를 드래그했을 때 플레이어가 움직이는 월드 거리 (도로 폭보다 살짝 크게) */
const DRAG_WORLD_WIDTH = 13;
/** 드래그 목표의 바깥 한계 (엔진이 분대 폭만큼 다시 안쪽으로 조정합니다) */
const DRAG_LIMIT = 3.9;
const KEY_VISIBLE_RATIO = 0.5;
const AUTO_PAUSE_RATIO = 0.15;
const TARGET_INTERACTIVE = "input, textarea, select, button, a, summary, [contenteditable], [role='dialog']";

type UiPhase = "ready" | "playing" | "paused" | "gameover" | "clear";

interface Hud {
  level: number;
  kills: number;
  expRatio: number;
  progress: number;
  squad: number;
  boss: boolean;
}

const INITIAL_HUD: Hud = { level: 1, kills: 0, expRatio: 0, progress: 0, squad: 3, boss: false };

function readBest(): number {
  try {
    const v = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}

function writeBest(v: number) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* 저장이 막힌 환경에서는 이번 방문 동안만 기록 */
  }
}

export default function ShooterGame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<UiPhase>("ready");
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [levelUp, setLevelUp] = useState<{ key: number; level: number; squad: number } | null>(null);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [ready3d, setReady3d] = useState(false);

  const stateRef = useRef<ShooterState>(createState());
  const phaseRef = useRef<UiPhase>("ready");
  const pausedRef = useRef(false);
  const hudRef = useRef<Hud>(INITIAL_HUD);
  const visibleRatioRef = useRef(0);
  const keysRef = useRef({ left: false, right: false });
  const dragRef = useRef<{ pointerId: number; startX: number; startPlayerX: number } | null>(null);
  const bestRef = useRef(0);
  const levelUpKeyRef = useRef(0);
  const levelUpTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const setPhaseBoth = useCallback((p: UiPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => {
    const saved = readBest();
    bestRef.current = saved;
    setBest(saved);
  }, []);

  const applyKeys = useCallback(() => {
    const k = keysRef.current;
    stateRef.current.input.moveDir = k.left === k.right ? 0 : k.left ? -1 : 1;
  }, []);

  const start = useCallback(() => {
    startGame(stateRef.current);
    keysRef.current = { left: false, right: false };
    dragRef.current = null;
    pausedRef.current = false;
    hudRef.current = INITIAL_HUD;
    setHud(INITIAL_HUD);
    setLevelUp(null);
    setNewBest(false);
    setPhaseBoth("playing");
  }, [setPhaseBoth]);

  const pause = useCallback(() => {
    if (phaseRef.current !== "playing" || pausedRef.current) return;
    pausedRef.current = true;
    keysRef.current = { left: false, right: false };
    dragRef.current = null;
    stateRef.current.input.moveDir = 0;
    stateRef.current.input.dragTargetX = null;
    setPhaseBoth("paused");
  }, [setPhaseBoth]);

  const resume = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    pausedRef.current = false;
    setPhaseBoth("playing");
  }, [setPhaseBoth]);

  // ── 3D 렌더러 생성 + 게임 루프 ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let cancelled = false;
    let raf = 0;
    let renderer: ShooterRenderer | null = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      try {
        // three.js는 크기가 크므로 게임 화면이 실제로 마운트될 때 불러옵니다.
        const { createRenderer } = await import("./shooterRenderer");
        if (cancelled) return;
        renderer = createRenderer(canvas);
      } catch (err) {
        console.error("[ShooterGame] 3D 렌더러를 만들지 못했습니다:", err);
        if (!cancelled) setFailed("이 기기에서는 3D 화면(WebGL)을 사용할 수 없어요.");
        return;
      }

      const fit = () => {
        const r = wrap.getBoundingClientRect();
        renderer?.resize(r.width, r.height);
      };
      fit();
      ro = new ResizeObserver(fit);
      ro.observe(wrap);
      setReady3d(true);

      let last = performance.now();
      const tick = (now: number) => {
        if (cancelled || !renderer) return;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        const s = stateRef.current;

        if (!pausedRef.current) update(s, dt);

        // HUD는 값이 바뀔 때만 React 상태를 갱신합니다.
        const h: Hud = {
          level: s.level,
          kills: s.kills,
          expRatio: s.level >= MAX_LEVEL ? 1 : s.exp / expToNext(s.level),
          progress: Math.min(1, s.distance / STAGE_LENGTH),
          squad: s.squad,
          boss: s.bossSpawned,
        };
        const prev = hudRef.current;
        if (
          h.level !== prev.level ||
          h.kills !== prev.kills ||
          h.boss !== prev.boss ||
          h.squad !== prev.squad ||
          Math.abs(h.expRatio - prev.expRatio) > 0.005 ||
          Math.abs(h.progress - prev.progress) > 0.005
        ) {
          hudRef.current = h;
          setHud(h);
        }

        for (const ev of s.events) {
          if (ev.type === "levelUp") {
            levelUpKeyRef.current += 1;
            setLevelUp({ key: levelUpKeyRef.current, level: ev.level, squad: ev.squad });
            clearTimeout(levelUpTimeoutRef.current);
            levelUpTimeoutRef.current = setTimeout(() => setLevelUp(null), 1300);
          } else if (ev.type === "gameOver" || ev.type === "stageClear") {
            const isNew = s.kills > bestRef.current;
            if (isNew) {
              bestRef.current = s.kills;
              writeBest(s.kills);
              setBest(s.kills);
            }
            setNewBest(isNew && s.kills > 0);
            s.input.dragTargetX = null;
            s.input.moveDir = 0;
            dragRef.current = null;
            setPhaseBoth(ev.type === "gameOver" ? "gameover" : "clear");
          }
        }

        renderer.render(s, dt);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(levelUpTimeoutRef.current);
      ro?.disconnect();
      renderer?.dispose();
      renderer = null;
    };
  }, [setPhaseBoth]);

  // ── 화면에 보이는 정도 추적 + 자동 일시정지 ──
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibleRatioRef.current = entry.intersectionRatio;
          if (entry.intersectionRatio < AUTO_PAUSE_RATIO) pause();
        }
      },
      { threshold: [0, AUTO_PAUSE_RATIO, KEY_VISIBLE_RATIO, 0.8, 1] }
    );
    io.observe(wrap);
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
    };
  }, [pause]);

  // ── 키보드: A/D, ←/→ 로 이동, Space/Enter 로 시작·재개 ──
  useEffect(() => {
    const isMoveKey = (e: KeyboardEvent) =>
      e.code === "KeyA" ||
      e.code === "KeyD" ||
      e.code === "ArrowLeft" ||
      e.code === "ArrowRight" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "a" ||
      e.key === "A" ||
      e.key === "d" ||
      e.key === "D";
    const isLeft = (e: KeyboardEvent) =>
      e.code === "KeyA" || e.code === "ArrowLeft" || e.key === "ArrowLeft" || e.key === "a" || e.key === "A";
    const isActionKey = (e: KeyboardEvent) =>
      e.code === "Space" || e.code === "Enter" || e.key === " " || e.key === "Enter";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target;
      if (target instanceof Element && target.closest(TARGET_INTERACTIVE)) return;
      const p = phaseRef.current;

      if (isMoveKey(e)) {
        if (p !== "playing" || visibleRatioRef.current < AUTO_PAUSE_RATIO) return;
        e.preventDefault(); // 화살표로 페이지가 스크롤되지 않게
        if (e.repeat) return;
        if (isLeft(e)) keysRef.current.left = true;
        else keysRef.current.right = true;
        applyKeys();
        return;
      }

      if (isActionKey(e)) {
        if (p === "playing") {
          if (visibleRatioRef.current >= AUTO_PAUSE_RATIO) e.preventDefault();
          return;
        }
        if (visibleRatioRef.current < KEY_VISIBLE_RATIO) return;
        e.preventDefault();
        if (e.repeat) return;
        if (p === "paused") resume();
        else if (p === "ready" || p === "gameover" || p === "clear") start();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isMoveKey(e)) return;
      if (isLeft(e)) keysRef.current.left = false;
      else keysRef.current.right = false;
      applyKeys();
    };

    const clearKeys = () => {
      keysRef.current = { left: false, right: false };
      applyKeys();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, [applyKeys, resume, start]);

  // ── 터치/마우스 드래그 ──
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (phaseRef.current === "paused") {
      resume();
      return;
    }
    if (phaseRef.current !== "playing") return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startPlayerX: stateRef.current.player.x,
    };
    stateRef.current.input.dragTargetX = stateRef.current.player.x;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 일부 환경에서는 캡처가 실패할 수 있어도 드래그는 동작합니다 */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const width = e.currentTarget.getBoundingClientRect().width || 1;
    const target = drag.startPlayerX + ((e.clientX - drag.startX) / width) * DRAG_WORLD_WIDTH;
    stateRef.current.input.dragTargetX = Math.max(-DRAG_LIMIT, Math.min(DRAG_LIMIT, target));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    stateRef.current.input.dragTargetX = null;
  };

  const playing = phase === "playing";

  return (
    <div className="w-full">
      <style>{`
        @keyframes shooter-levelup { 0% { transform: scale(0.4); opacity: 0; } 25% { transform: scale(1.15); opacity: 1; } 70% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.05) translateY(-24px); opacity: 0; } }
        @keyframes shooter-pop { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative mx-auto select-none overflow-hidden rounded-[28px] border-4 border-white bg-sky-300 shadow-[0_20px_50px_-15px_rgba(40,90,140,0.55)]"
        style={{
          // 화면 폭과 높이 둘 다에 맞춰 항상 세로형(9:16) 프레임을 유지합니다.
          width: "min(100%, 460px, calc(82vh * 9 / 16))",
          aspectRatio: "9 / 16",
          containerType: "inline-size",
          // 플레이 중에만 화면 드래그를 게임이 가져가고, 그 밖에는 페이지 스크롤이 가능합니다.
          touchAction: playing ? "none" : "pan-y",
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" aria-label="3D 슈팅 러너 게임 화면" />

        {/* HUD */}
        {(playing || phase === "paused") && (
          <>
            <div className="pointer-events-none absolute left-[3cqw] top-[10cqw] w-[44%] text-left">
              <div
                className="inline-flex items-center whitespace-nowrap rounded-2xl bg-white/95 px-[3cqw] py-[1.4cqw] font-black tracking-wide text-slate-800 shadow-md"
                style={{ fontSize: "clamp(9px, 4.6cqw, 22px)" }}
              >
                LEVEL {hud.level}
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-full border-2 border-white bg-slate-800/25">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-orange-400 transition-[width] duration-200"
                  style={{ width: `${Math.round(hud.expRatio * 100)}%` }}
                />
              </div>
              <p
                className="mt-1 whitespace-nowrap font-extrabold text-white drop-shadow"
                style={{ fontSize: "clamp(8px, 3.2cqw, 14px)" }}
              >
                병력 {hud.squad}명
              </p>
            </div>

            <div className="pointer-events-none absolute right-[3cqw] top-[10cqw] text-right">
              <div
                className="inline-flex items-baseline gap-[1.2cqw] whitespace-nowrap rounded-2xl bg-white/95 px-[3cqw] py-[1.4cqw] shadow-md"
                style={{ fontSize: "clamp(9px, 4.6cqw, 22px)" }}
              >
                <span className="font-extrabold text-slate-500" style={{ fontSize: "0.7em" }}>처치</span>
                <span className="font-black leading-none text-slate-800">{hud.kills}</span>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-[3cqw] top-[2.4cqw]">
              <div className="h-[2.2cqw] min-h-[5px] overflow-hidden rounded-full border-2 border-white bg-slate-800/25">
                <div
                  className={`h-full rounded-full transition-[width] duration-200 ${hud.boss ? "bg-rose-400" : "bg-sky-500"}`}
                  style={{ width: `${Math.round(hud.progress * 100)}%` }}
                />
              </div>
              <div
                className="mt-[0.6cqw] flex justify-between font-extrabold text-white drop-shadow"
                style={{ fontSize: "clamp(7px, 2.6cqw, 11px)" }}
              >
                <span>STAGE 1</span>
                <span className={hud.boss ? "text-rose-200" : ""}>{hud.boss ? "BOSS!" : "BOSS"}</span>
              </div>
            </div>          </>
        )}

        {/* LEVEL UP 연출 */}
        {levelUp && playing && (
          <div key={levelUp.key} className="pointer-events-none absolute inset-x-0 top-[24%] flex flex-col items-center">
            <div
              className="rounded-3xl bg-yellow-300 px-6 py-2 text-3xl font-black tracking-wider text-orange-600 shadow-xl ring-4 ring-white sm:text-4xl"
              style={{ animation: "shooter-levelup 1.3s ease-out forwards" }}
            >
              LEVEL UP!
            </div>
            <p
              className="mt-2 rounded-full bg-white/95 px-4 py-1 text-sm font-black text-slate-700 shadow"
              style={{ animation: "shooter-levelup 1.3s ease-out forwards" }}
            >
              LEVEL {levelUp.level} · 병력 +1 (총 {levelUp.squad}명)
            </p>
          </div>
        )}

        {/* 시작 화면 */}
        {phase === "ready" && !failed && (
          <Overlay tone="light" raised>
            <p className="rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold tracking-widest text-sky-600">
              KUBS TIGER SHOOTER
            </p>
            <h3 className="mt-3 text-4xl font-black leading-tight text-white drop-shadow-[0_3px_0_rgba(30,90,140,0.6)] sm:text-5xl">
              타이거
              <br />
              슈팅 러너
            </h3>
            <button
              type="button"
              onClick={start}
              disabled={!ready3d}
              className="mt-7 rounded-full bg-gradient-to-b from-yellow-300 to-orange-400 px-12 py-4 text-2xl font-black tracking-wider text-white shadow-[0_6px_0_#d9761a,0_12px_20px_rgba(0,0,0,0.25)] transition-transform active:translate-y-1 active:shadow-[0_2px_0_#d9761a] disabled:opacity-60"
            >
              {ready3d ? "START" : "LOADING..."}
            </button>
            <ul className="mt-6 space-y-1 text-center text-xs font-bold text-white drop-shadow sm:text-sm">
              <li>← → / A D 또는 화면 드래그로 좌우 이동</li>
              <li>파란 장벽(+N)은 먹고, 빨간 장벽(-N)은 피하세요</li>
              <li>병력이 모두 쓰러지면 게임 오버!</li>
            </ul>
            {best > 0 && (
              <p className="mt-4 rounded-full bg-white/90 px-4 py-1 text-xs font-black text-slate-700">
                최고 처치 {best}
              </p>
            )}
          </Overlay>
        )}

        {/* 일시정지 */}
        {phase === "paused" && (
          <Overlay tone="dark">
            <p className="text-3xl font-black text-white">일시정지</p>
            <button
              type="button"
              onClick={resume}
              className="mt-5 rounded-full bg-white px-8 py-3 text-lg font-black text-sky-600 shadow-lg"
            >
              계속하기
            </button>
          </Overlay>
        )}

        {/* 게임 오버 / 스테이지 클리어 */}
        {(phase === "gameover" || phase === "clear") && (
          <Overlay tone="dark">
            <p
              className={`text-4xl font-black drop-shadow ${phase === "clear" ? "text-yellow-300" : "text-white"}`}
            >
              {phase === "clear" ? "STAGE CLEAR!" : "GAME OVER"}
            </p>
            {newBest && <p className="mt-1 text-sm font-black text-yellow-300">NEW BEST!</p>}
            <div className="mt-4 flex gap-3">
              <Stat label="처치" value={hud.kills} />
              <Stat label="LEVEL" value={hud.level} />
              <Stat label="최고" value={Math.max(best, hud.kills)} />
            </div>
            <button
              type="button"
              onClick={start}
              className="mt-7 rounded-full bg-gradient-to-b from-yellow-300 to-orange-400 px-10 py-3.5 text-xl font-black tracking-wider text-white shadow-[0_6px_0_#d9761a,0_12px_20px_rgba(0,0,0,0.25)] transition-transform active:translate-y-1 active:shadow-[0_2px_0_#d9761a]"
            >
              {phase === "clear" ? "다시 도전" : "RETRY"}
            </button>
          </Overlay>
        )}

        {failed && (
          <Overlay tone="dark">
            <p className="px-6 text-center text-sm font-bold text-white">{failed}</p>
          </Overlay>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-ink-faint">
        ← → / A D 또는 화면 드래그로 좌우 이동 · 병력이 각자 자동 발사 · 장벽 숫자로 병력을 늘리세요
      </p>
    </div>
  );
}

function Overlay({
  tone,
  raised,
  children,
}: {
  tone: "light" | "dark";
  /** 아래쪽(플레이어가 서 있는 자리)을 비우기 위해 내용을 위로 올립니다 */
  raised?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center p-6 text-center ${
        raised ? "justify-start pt-[14%]" : "justify-center"
      } ${
        tone === "dark" ? "bg-slate-900/55 backdrop-blur-[2px]" : "bg-sky-400/20"
      }`}
      style={{ animation: "shooter-pop 0.25s ease-out" }}
    >
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[68px] rounded-2xl bg-white/95 px-3 py-2 shadow">
      <p className="text-[10px] font-extrabold text-slate-500">{label}</p>
      <p className="text-2xl font-black leading-none text-slate-800">{value}</p>
    </div>
  );
}
