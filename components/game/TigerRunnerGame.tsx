"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { kubsHistory, type KubsHistoryEntry } from "@/lib/data/kubsHistory";
import {
  TIGER_H,
  TIGER_W,
  drawObstacle,
  drawTiger,
  obstacleBox,
  randomObstacleSpec,
  type ObstacleSpec,
} from "./tigerSprites";
import HistoryFilmModal from "./HistoryFilmModal";

const CANVAS_W = 640;
const CANVAS_H = 200;
const GROUND_Y = 150;
const TIGER_X = 40;
const FLY_BASE_Y = GROUND_Y - TIGER_H; // 서 있는 호랑이 머리 높이, 새의 기준선

const GRAVITY = 0.9;
const JUMP_VELOCITY = -13.5;
const BASE_SPEED = 4.2;
const MAX_SPEED = 10.5;
const SPEED_STEP = 0.7;
const OBSTACLES_PER_SPEEDUP = 5;
const OBSTACLES_PER_HISTORY = 10;
const COUNTDOWN_STEP_MS = 700;

interface Obstacle extends ObstacleSpec {
  x: number;
  counted: boolean;
}

type Phase = "idle" | "playing" | "history" | "countdown" | "gameover";

function shuffledIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function TigerRunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [historyEntry, setHistoryEntry] = useState<KubsHistoryEntry | null>(
    null
  );
  const [finalScore, setFinalScore] = useState(0);
  const [historySeenCount, setHistorySeenCount] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [speedFlash, setSpeedFlash] = useState(false);

  const phaseRef = useRef<Phase>("idle");
  const posYRef = useRef(GROUND_Y - TIGER_H);
  const velYRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const speedRef = useRef(BASE_SPEED);
  const speedStepRef = useRef(0);
  const speedFlashTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const nextSpawnRef = useRef(80);
  const clearedRef = useRef(0);
  const sinceHistoryRef = useRef(0);
  const runFrameRef = useRef<0 | 1>(0);
  const runFrameTimerRef = useRef(0);
  const groundOffsetRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>();

  const historyQueueRef = useRef<number[]>([]);
  const historyQueueIdxRef = useRef(0);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const nextHistoryEntry = useCallback((): KubsHistoryEntry => {
    if (historyQueueIdxRef.current >= historyQueueRef.current.length) {
      historyQueueRef.current = shuffledIndices(kubsHistory.length);
      historyQueueIdxRef.current = 0;
    }
    const idx = historyQueueRef.current[historyQueueIdxRef.current];
    historyQueueIdxRef.current += 1;
    return kubsHistory[idx];
  }, []);

  const resetRun = useCallback(() => {
    posYRef.current = GROUND_Y - TIGER_H;
    velYRef.current = 0;
    obstaclesRef.current = [];
    speedRef.current = BASE_SPEED;
    speedStepRef.current = 0;
    nextSpawnRef.current = 150;
    clearedRef.current = 0;
    sinceHistoryRef.current = 0;
    runFrameRef.current = 0;
    runFrameTimerRef.current = 0;
  }, []);

  const jump = useCallback(() => {
    if (posYRef.current >= GROUND_Y - TIGER_H - 1) {
      velYRef.current = JUMP_VELOCITY;
    }
  }, []);

  const startGame = useCallback(() => {
    resetRun();
    setPhaseBoth("playing");
  }, [resetRun]);

  const resumeAfterHistory = useCallback(() => {
    setHistoryEntry(null);
    setPhaseBoth("countdown");
    setCountdown(3);
  }, []);

  // "역사 확인 → 3,2,1 카운트다운 → 재개" 흐름. 카운트다운 중에는
  // 게임 루프가 phase !== "playing" 이라 자동으로 멈춰 있습니다.
  useEffect(() => {
    if (phase !== "countdown" || countdown === null) return;

    if (countdown <= 1) {
      const t = setTimeout(() => {
        setCountdown(null);
        setPhaseBoth("playing");
      }, COUNTDOWN_STEP_MS);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), COUNTDOWN_STEP_MS);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const handlePrimaryAction = useCallback(() => {
    if (phaseRef.current === "idle") {
      startGame();
    } else if (phaseRef.current === "playing") {
      jump();
    } else if (phaseRef.current === "gameover") {
      startGame();
    } else if (phaseRef.current === "history") {
      resumeAfterHistory();
    }
  }, [jump, startGame, resumeAfterHistory]);

  // 키보드 / 클릭 입력
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        e.preventDefault();
        handlePrimaryAction();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlePrimaryAction]);

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const tick = (time: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 16.6667, 2.5);
      lastTimeRef.current = time;

      const currentPhase = phaseRef.current;

      if (currentPhase === "playing") {
        // 물리
        velYRef.current += GRAVITY * dt;
        posYRef.current += velYRef.current * dt;
        if (posYRef.current > GROUND_Y - TIGER_H) {
          posYRef.current = GROUND_Y - TIGER_H;
          velYRef.current = 0;
        }

        // 달리기 애니메이션 프레임
        runFrameTimerRef.current += dt;
        if (runFrameTimerRef.current > 6) {
          runFrameTimerRef.current = 0;
          runFrameRef.current = runFrameRef.current === 0 ? 1 : 0;
        }

        // 장애물 이동 및 스폰
        groundOffsetRef.current =
          (groundOffsetRef.current + speedRef.current * dt) % 24;

        nextSpawnRef.current -= speedRef.current * dt;
        if (nextSpawnRef.current <= 0) {
          const spec = randomObstacleSpec();
          obstaclesRef.current.push({ ...spec, x: CANVAS_W + 10, counted: false });
          nextSpawnRef.current = 210 + Math.random() * 170;
        }

        const tigerBox = {
          x: TIGER_X + 7,
          y: posYRef.current + 5,
          w: TIGER_W - 14,
          h: TIGER_H - 7,
        };

        let collided = false;
        for (const ob of obstaclesRef.current) {
          ob.x -= speedRef.current * ob.speedMul * dt;

          const obBox = obstacleBox(ob, GROUND_Y, FLY_BASE_Y);
          const overlap =
            tigerBox.x < obBox.x + obBox.w &&
            tigerBox.x + tigerBox.w > obBox.x &&
            tigerBox.y < obBox.y + obBox.h &&
            tigerBox.y + tigerBox.h > obBox.y;
          if (overlap) collided = true;

          if (!ob.counted && ob.x + ob.width < TIGER_X) {
            ob.counted = true;
            clearedRef.current += 1;
            sinceHistoryRef.current += 1;

            // 장애물 5개를 넘을 때마다 속도를 한 단계씩 눈에 띄게 올립니다.
            const newStep = Math.floor(clearedRef.current / OBSTACLES_PER_SPEEDUP);
            if (newStep > speedStepRef.current) {
              speedStepRef.current = newStep;
              speedRef.current = Math.min(
                MAX_SPEED,
                BASE_SPEED + newStep * SPEED_STEP
              );
              setSpeedFlash(true);
              clearTimeout(speedFlashTimeoutRef.current);
              speedFlashTimeoutRef.current = setTimeout(
                () => setSpeedFlash(false),
                900
              );
            }
          }
        }
        obstaclesRef.current = obstaclesRef.current.filter(
          (ob) => ob.x + ob.width > -20
        );

        if (collided) {
          setFinalScore(clearedRef.current);
          setPhaseBoth("gameover");
        } else if (sinceHistoryRef.current >= OBSTACLES_PER_HISTORY) {
          sinceHistoryRef.current = 0;
          const entry = nextHistoryEntry();
          setHistoryEntry(entry);
          setHistorySeenCount((c) => c + 1);
          setPhaseBoth("history");
        }
      }

      // ---------- 렌더 ----------
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // 배경
      ctx.fillStyle = "#141019";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // 바닥
      ctx.fillStyle = "#0c0910";
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
      ctx.fillStyle = "#4a3f4d";
      ctx.fillRect(0, GROUND_Y, CANVAS_W, 2);
      ctx.fillStyle = "#6c5c6e";
      for (let x = -24; x < CANVAS_W; x += 24) {
        const dashX = x - groundOffsetRef.current;
        ctx.fillRect(dashX, GROUND_Y + 5, 10, 2);
      }

      // 장애물
      const wingFrame = runFrameRef.current;
      for (const ob of obstaclesRef.current) {
        drawObstacle(ctx, ob.x, GROUND_Y, FLY_BASE_Y, ob, wingFrame);
      }

      // 호랑이
      const pose =
        currentPhase === "gameover"
          ? "hit"
          : posYRef.current < GROUND_Y - TIGER_H - 1
          ? "jump"
          : runFrameRef.current === 0
          ? "run0"
          : "run1";
      drawTiger(ctx, TIGER_X, posYRef.current, pose);

      // HUD
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "12px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`SCORE ${clearedRef.current}`, CANVAS_W - 12, 20);

      // 다음 역사까지 진행 바
      const barW = 120;
      const ratio =
        currentPhase === "playing"
          ? Math.min(1, sinceHistoryRef.current / OBSTACLES_PER_HISTORY)
          : 0;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(CANVAS_W - 12 - barW, 28, barW, 4);
      ctx.fillStyle = "#E8443A";
      ctx.fillRect(CANVAS_W - 12 - barW, 28, barW * ratio, 4);

      if (currentPhase === "idle") {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "14px monospace";
        ctx.fillText(
          "스페이스바 / 클릭으로 시작",
          CANVAS_W / 2,
          CANVAS_H / 2 - 6
        );
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(speedFlashTimeoutRef.current);
      lastTimeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-2xl">
      <div className="relative overflow-hidden rounded-2xl border border-ivory/15">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={handlePrimaryAction}
          className="block w-full cursor-pointer [image-rendering:pixelated]"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        />

        {speedFlash && phase === "playing" && (
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <span className="rounded-full bg-crimson/90 px-4 py-1 text-xs font-semibold tracking-wide text-ivory">
              SPEED UP!
            </span>
          </div>
        )}

        {phase === "countdown" && countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/50">
            <span className="font-serif text-7xl font-bold text-ivory">
              {countdown}
            </span>
          </div>
        )}

        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/70 text-center">
            <p className="font-serif text-xl font-semibold text-ivory">
              게임 오버
            </p>
            <p className="text-sm text-ivory/70">
              장애물 {finalScore}개 통과 · 역사 {historySeenCount}개 확인
            </p>
            <button
              onClick={startGame}
              className="rounded-full bg-crimson px-5 py-2 text-sm font-medium text-ivory transition-colors hover:bg-crimson-deep"
            >
              다시 시작
            </button>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-ivory/50">
        스페이스바·↑ 또는 화면 클릭으로 점프 · 장애물 {OBSTACLES_PER_HISTORY}개를
        넘으면 경영대학의 역사가 열립니다
      </p>

      {phase === "history" && historyEntry && (
        <HistoryFilmModal entry={historyEntry} onContinue={resumeAfterHistory} />
      )}
    </div>
  );
}
