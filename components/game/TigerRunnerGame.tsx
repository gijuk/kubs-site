"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { kubsHistory, type KubsHistoryEntry } from "@/lib/data/kubsHistory";
import { drawObstacle, drawTiger } from "./tigerSprites";
import Portal from "@/components/common/Portal";
import HistoryFilmModal from "./HistoryFilmModal";
import { GROUND_Y, TIGER_X, WORLD_H, WORLD_W } from "./gameConstants";
import {
  FLY_BASE_Y,
  OBSTACLES_PER_HISTORY,
  STAND_Y,
  createEngine,
  ensureResumeBuffer,
  isGrounded,
  jump,
  step,
  type EngineState,
} from "./gameEngine";
import { drawBackground } from "./gameScenery";

const COUNTDOWN_STEP_MS = 700;
// 착지 직전에 눌러둔 점프를 이 프레임 수 동안 기억해서, 착지하자마자 점프합니다.
const JUMP_BUFFER_FRAMES = 7;
// 게임 오버 직후 정신없이 누르던 키로 바로 재시작되는 것을 막는 시간
const RESTART_LOCK_MS = 600;
const BEST_KEY = "kubs-game-best";
// 이 비율 이상 화면에 보일 때만 키보드로 시작/점프 (페이지를 스페이스로 내리다 게임이 시작되지 않도록)
const KEY_VISIBLE_RATIO = 0.5;
// 플레이 중 이 비율 밑으로 화면에서 벗어나면 자동 일시정지
const AUTO_PAUSE_RATIO = 0.15;

type Phase = "idle" | "playing" | "paused" | "history" | "countdown" | "gameover";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

function shuffledIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

export default function TigerRunnerGame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [historyEntry, setHistoryEntry] = useState<KubsHistoryEntry | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(0);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [historySeenCount, setHistorySeenCount] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [speedFlash, setSpeedFlash] = useState<number | null>(null);

  const phaseRef = useRef<Phase>("idle");
  const engineRef = useRef<EngineState>(createEngine());
  const bestRef = useRef(0);
  const visibleRatioRef = useRef(0);
  const jumpBufferRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef(0);
  const dustTimerRef = useRef(0);
  const restartUnlockRef = useRef(0);
  const speedFlashTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>();

  const historyQueueRef = useRef<number[]>([]);
  const historyQueueIdxRef = useRef(0);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  useEffect(() => {
    const saved = readBest();
    bestRef.current = saved;
    setBest(saved);
  }, []);

  const nextHistoryEntry = useCallback((): KubsHistoryEntry => {
    if (historyQueueIdxRef.current >= historyQueueRef.current.length) {
      historyQueueRef.current = shuffledIndices(kubsHistory.length);
      historyQueueIdxRef.current = 0;
    }
    const idx = historyQueueRef.current[historyQueueIdxRef.current];
    historyQueueIdxRef.current += 1;
    return kubsHistory[idx];
  }, []);

  const spawnDust = useCallback((count: number, spread: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: TIGER_X + 10 + Math.random() * 8,
        y: GROUND_Y - 2,
        vx: -1 - Math.random() * spread,
        vy: -0.4 - Math.random() * 1.2,
        life: 0,
        max: 16 + Math.random() * 10,
        size: 2 + Math.floor(Math.random() * 2),
        color: "rgba(255,243,221,0.55)",
      });
    }
  }, []);

  const spawnBurst = useCallback((x: number, y: number) => {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 1.5 + Math.random() * 3.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 1,
        life: 0,
        max: 26 + Math.random() * 18,
        size: 3,
        color: i % 2 ? "#EE8B3C" : "#FFF3DD",
      });
    }
  }, []);

  const startGame = useCallback(() => {
    engineRef.current = createEngine();
    particlesRef.current = [];
    jumpBufferRef.current = 0;
    shakeRef.current = 0;
    setHistorySeenCount(0);
    setNewBest(false);
    setSpeedFlash(null);
    setPhaseBoth("playing");
  }, []);

  const beginCountdown = useCallback(() => {
    setHistoryEntry(null);
    setPhaseBoth("countdown");
    setCountdown(3);
  }, []);

  // "역사 확인/일시정지 → 3,2,1 → 재개" 흐름. 카운트다운 중에는 게임 루프가 멈춰 있고,
  // 재개하는 순간 가장 가까운 장애물이 충분히 멀리 있도록 밀어줍니다.
  useEffect(() => {
    if (phase !== "countdown" || countdown === null) return;

    if (countdown <= 1) {
      const t = setTimeout(() => {
        ensureResumeBuffer(engineRef.current);
        jumpBufferRef.current = 0;
        setCountdown(null);
        setPhaseBoth("playing");
      }, COUNTDOWN_STEP_MS);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), COUNTDOWN_STEP_MS);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const handlePrimaryAction = useCallback(() => {
    const p = phaseRef.current;
    if (p === "idle") {
      startGame();
    } else if (p === "playing") {
      const s = engineRef.current;
      if (isGrounded(s)) {
        jump(s);
        jumpBufferRef.current = 0;
        spawnDust(4, 1.5);
      } else {
        jumpBufferRef.current = JUMP_BUFFER_FRAMES;
      }
    } else if (p === "gameover") {
      if (performance.now() >= restartUnlockRef.current) startGame();
    } else if (p === "paused") {
      beginCountdown();
    }
    // history 단계는 HistoryFilmModal이 입력을 처리합니다.
  }, [startGame, beginCountdown, spawnDust]);

  // 키보드: 게임 화면이 보일 때만, 입력창/버튼 등에서는 절대 가로채지 않습니다.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isActionKey =
        e.code === "Space" ||
        e.code === "ArrowUp" ||
        e.code === "Enter" ||
        e.key === " " ||
        e.key === "ArrowUp" ||
        e.key === "Enter";
      if (!isActionKey) return;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, button, a, summary, [contenteditable], [role='dialog']"
        )
      ) {
        return;
      }
      if (phaseRef.current === "history") return;
      const needed = phaseRef.current === "playing" ? AUTO_PAUSE_RATIO : KEY_VISIBLE_RATIO;
      if (visibleRatioRef.current < needed) return;
      e.preventDefault();
      handlePrimaryAction();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlePrimaryAction]);

  // 화면에서 벗어나거나 탭이 가려지면 자동 일시정지
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const pauseIfPlaying = () => {
      if (phaseRef.current === "playing") setPhaseBoth("paused");
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibleRatioRef.current = entry.intersectionRatio;
          if (entry.intersectionRatio < AUTO_PAUSE_RATIO) pauseIfPlaying();
        }
      },
      { threshold: [0, AUTO_PAUSE_RATIO, KEY_VISIBLE_RATIO, 0.8, 1] }
    );
    io.observe(wrap);

    const onVisibility = () => {
      if (document.hidden) pauseIfPlaying();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pauseIfPlaying);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pauseIfPlaying);
    };
  }, []);

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const onGameOver = (s: EngineState) => {
      const score = s.cleared;
      const isNewBest = score > bestRef.current;
      if (isNewBest) {
        bestRef.current = score;
        writeBest(score);
        setBest(score);
      }
      setNewBest(isNewBest && score > 0);
      setFinalScore(score);
      setFinalLevel(s.level);
      shakeRef.current = 14;
      spawnBurst(TIGER_X + 22, s.posY + 16);
      restartUnlockRef.current = performance.now() + RESTART_LOCK_MS;
      setPhaseBoth("gameover");
    };

    const tick = (time: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 16.6667, 2.5);
      lastTimeRef.current = time;

      const s = engineRef.current;
      const currentPhase = phaseRef.current;

      if (currentPhase === "playing") {
        // 큰 dt는 잘게 나눠서 계산 (빠른 장애물이 호랑이를 통과해버리는 것을 방지)
        const n = Math.max(1, Math.ceil(dt));
        const sub = dt / n;
        let collided = false;
        let jumpedFromBuffer = false;

        for (let i = 0; i < n && !collided; i++) {
          if (jumpBufferRef.current > 0) {
            jumpBufferRef.current -= sub;
            if (isGrounded(s)) {
              jump(s);
              jumpBufferRef.current = 0;
              jumpedFromBuffer = true;
            }
          }
          const ev = step(s, sub);
          if (ev.landed) spawnDust(6, 2);
          if (ev.speedUp) {
            setSpeedFlash(s.level + 1);
            clearTimeout(speedFlashTimeoutRef.current);
            speedFlashTimeoutRef.current = setTimeout(() => setSpeedFlash(null), 1100);
          }
          if (ev.collided) collided = true;
        }
        if (jumpedFromBuffer) spawnDust(4, 1.5);

        // 달리는 동안 발밑 먼지
        if (isGrounded(s)) {
          dustTimerRef.current += dt;
          if (dustTimerRef.current > 5) {
            dustTimerRef.current = 0;
            spawnDust(1, 1);
          }
        }

        if (collided) {
          onGameOver(s);
        } else if (s.sinceHistory >= OBSTACLES_PER_HISTORY) {
          s.sinceHistory = 0;
          jumpBufferRef.current = 0;
          setHistoryEntry(nextHistoryEntry());
          setHistorySeenCount((c) => c + 1);
          setPhaseBoth("history");
        }
      } else if (currentPhase === "idle") {
        s.scroll += 1.2 * dt;
        s.runTimer += dt;
        if (s.runTimer > 8) {
          s.runTimer = 0;
          s.runFrame = s.runFrame === 0 ? 1 : 0;
        }
      }

      // 파티클
      const parts = particlesRef.current;
      for (const p of parts) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.12 * dt;
      }
      particlesRef.current = parts.filter((p) => p.life < p.max);

      // ---------- 렌더 ----------
      ctx.save();
      ctx.clearRect(0, 0, WORLD_W, WORLD_H);
      if (shakeRef.current > 0) {
        const m = shakeRef.current;
        ctx.translate(Math.round((Math.random() - 0.5) * m), Math.round((Math.random() - 0.5) * m));
        shakeRef.current = Math.max(0, shakeRef.current - dt);
      }

      drawBackground(ctx, s.scroll, s.level, time);

      const wingFrame = s.runFrame;
      for (const ob of s.obstacles) {
        drawObstacle(ctx, ob.x, GROUND_Y, FLY_BASE_Y, ob, wingFrame);
      }

      const pose =
        currentPhase === "gameover"
          ? "hit"
          : !isGrounded(s)
          ? "jump"
          : s.runFrame === 0
          ? "run0"
          : "run1";
      // 호랑이 그림자
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      const shadowW = 30 - Math.min(14, (STAND_Y - s.posY) / 6);
      ctx.fillRect(TIGER_X + 22 - shadowW / 2, GROUND_Y + 1, shadowW, 3);
      drawTiger(ctx, TIGER_X, s.posY, pose);

      for (const p of particlesRef.current) {
        ctx.globalAlpha = 1 - p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.font = "bold 20px monospace";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(`LV ${s.level + 1}`, 16, 14);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(`SCORE ${s.cleared}`, WORLD_W - 16, 14);
      ctx.font = "bold 16px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(`BEST ${Math.max(bestRef.current, s.cleared)}`, WORLD_W - 16, 40);

      // 다음 역사까지 진행 바
      const barW = 160;
      const ratio =
        currentPhase === "idle" ? 0 : Math.min(1, s.sinceHistory / OBSTACLES_PER_HISTORY);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(WORLD_W - 16 - barW, 66, barW, 6);
      ctx.fillStyle = "#E8443A";
      ctx.fillRect(WORLD_W - 16 - barW, 66, barW * ratio, 6);
      ctx.restore();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(speedFlashTimeoutRef.current);
      lastTimeRef.current = null;
    };
  }, [nextHistoryEntry, spawnBurst, spawnDust]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    handlePrimaryAction();
  };

  return (
    <div className="w-full max-w-[1100px]">
      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        className="relative cursor-pointer touch-manipulation select-none overflow-hidden rounded-2xl border border-ivory-fixed/15 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]"
      >
        <canvas
          ref={canvasRef}
          width={WORLD_W}
          height={WORLD_H}
          role="img"
          aria-label="호랑이가 장애물을 넘는 미니게임 화면"
          className="block w-full [image-rendering:pixelated]"
          style={{ aspectRatio: `${WORLD_W} / ${WORLD_H}` }}
        />

        {speedFlash !== null && phase === "playing" && (
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <span className="animate-fade-up rounded-full bg-crimson/90 px-4 py-1 text-xs font-semibold tracking-wide text-ivory-fixed sm:text-sm">
              SPEED UP! · LV {speedFlash}
            </span>
          </div>
        )}

        {phase === "idle" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25 text-center">
            <p className="font-serif text-lg font-semibold text-ivory-fixed sm:text-2xl">
              스페이스바 · ↑ · 화면 터치로 시작
            </p>
            <p className="text-xs text-ivory-fixed/70 sm:text-sm">
              {best > 0 ? `내 최고 기록 ${best}개` : "장애물을 넘고 경영대학의 역사를 만나보세요"}
            </p>
          </div>
        )}

        {phase === "paused" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-center">
            <p className="font-serif text-xl font-semibold text-ivory-fixed sm:text-2xl">
              일시정지
            </p>
            <p className="text-xs text-ivory-fixed/70 sm:text-sm">
              스페이스바 또는 화면 터치로 계속하기
            </p>
          </div>
        )}

        {phase === "countdown" && countdown !== null && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="font-serif text-7xl font-bold text-ivory-fixed">
              {countdown}
            </span>
          </div>
        )}

        {phase === "gameover" && (
          <div className="pointer-events-none absolute inset-0 flex animate-fade-up flex-col items-center justify-center gap-2 bg-black/70 text-center">
            <p className="font-serif text-2xl font-semibold text-ivory-fixed sm:text-3xl">
              게임 오버
            </p>
            {newBest && (
              <p className="text-sm font-semibold tracking-wide text-crimson-bright">
                NEW BEST!
              </p>
            )}
            <p className="text-sm text-ivory-fixed/75">
              장애물 {finalScore}개 통과 · LV {finalLevel + 1} · 역사 {historySeenCount}개 확인
            </p>
            <p className="text-xs text-ivory-fixed/50">최고 기록 {best}개</p>
            <p className="mt-2 rounded-full bg-crimson px-5 py-2 text-sm font-medium text-ivory-fixed">
              스페이스바 · 화면 터치로 다시 시작
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-ivory-fixed/50">
        스페이스바·↑ 또는 화면 터치로 점프 · 장애물 {OBSTACLES_PER_HISTORY}개를
        넘으면 경영대학의 역사가 열립니다 · 넘을수록 점점 빨라져요
      </p>

      {phase === "history" && historyEntry && (
        <Portal>
          <HistoryFilmModal entry={historyEntry} onContinue={beginCountdown} />
        </Portal>
      )}
    </div>
  );
}
