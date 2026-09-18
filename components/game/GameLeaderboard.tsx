"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { RotateCw, Trophy } from "lucide-react";
import {
  getLeaderboardAction,
  submitScoreAction,
  type LeaderboardData,
} from "@/app/game/actions";

const PLAYER_KEY = "kubs-game-player";
const NICK_KEY = "kubs-game-nick";

export interface FinishedRun {
  /** 게임 오버마다 바뀌는 값 (같은 기록을 두 번 등록하지 않도록 구분) */
  id: number;
  score: number;
  durationMs: number;
}

function makeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // 아주 오래된 브라우저용 대체 (랭킹 식별용이라 암호학적 강도는 필요 없습니다)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}

function loadPlayerId(): string {
  try {
    const saved = localStorage.getItem(PLAYER_KEY);
    if (saved) return saved;
    const fresh = makeUuid();
    localStorage.setItem(PLAYER_KEY, fresh);
    return fresh;
  } catch {
    return makeUuid();
  }
}

export default function GameLeaderboard({
  run,
  onTopScore,
}: {
  run: FinishedRun | null;
  /** 전체 1위 점수를 게임 화면(HUD)에 알려줍니다 */
  onTopScore: (score: number) => void;
}) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedRunId, setSubmittedRunId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const playerIdRef = useRef<string>("");

  const applyData = useCallback(
    (next: LeaderboardData) => {
      setData(next);
      setStatus("ready");
      onTopScore(next.top[0]?.score ?? 0);
    },
    [onTopScore]
  );

  const load = useCallback(() => {
    setStatus("loading");
    getLeaderboardAction(playerIdRef.current).then((result) => {
      if (result) applyData(result);
      else setStatus("error");
    });
  }, [applyData]);

  useEffect(() => {
    playerIdRef.current = loadPlayerId();
    try {
      setNickname(localStorage.getItem(NICK_KEY) ?? "");
    } catch {
      /* 저장소를 못 쓰면 매번 입력 */
    }
    load();
  }, [load]);

  // 새 게임을 시작하면(=run이 비워지면) 이전 등록 안내를 지웁니다.
  useEffect(() => {
    if (run === null) {
      setMessage(null);
      setError(null);
    }
  }, [run]);

  const myBest = data?.me?.score ?? 0;
  const canSubmit =
    run !== null && run.score > 0 && submittedRunId !== run.id && status === "ready";
  const beatsMyRecord = run !== null && run.score > myBest;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!run || pending) return;
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await submitScoreAction({
        playerId: playerIdRef.current,
        nickname,
        score: run.score,
        durationMs: run.durationMs,
      });
      if (!result.ok || !result.data) {
        setError(result.error ?? "기록 등록에 실패했습니다.");
        return;
      }
      try {
        localStorage.setItem(NICK_KEY, nickname.trim().slice(0, 12));
      } catch {
        /* 무시 */
      }
      setSubmittedRunId(run.id);
      applyData(result.data);
      setMessage(
        result.improved
          ? `등록 완료! 현재 ${result.data.me?.rank ?? "-"}위예요.`
          : "이미 더 높은 기록이 등록되어 있어 기존 기록을 유지했어요."
      );
    });
  };

  return (
    <div className="mt-8 w-full max-w-[1100px] rounded-2xl border border-ivory-fixed/15 bg-ivory-fixed/5 p-5 text-left sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-ivory-fixed">
          <Trophy size={18} strokeWidth={1.75} className="text-crimson-bright" />
          전체 랭킹 TOP 10
        </h3>
        <div className="flex items-center gap-3 text-xs text-ivory-fixed/55">
          {data && <span>참여 {data.totalPlayers}명</span>}
          <button
            type="button"
            onClick={load}
            disabled={status === "loading"}
            aria-label="랭킹 새로고침"
            className="flex items-center gap-1 rounded-full border border-ivory-fixed/20 px-2.5 py-1 transition-colors hover:border-ivory-fixed/50 hover:text-ivory-fixed disabled:opacity-50"
          >
            <RotateCw size={12} strokeWidth={1.75} className={status === "loading" ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>
      </div>

      {data?.me && (
        <p className="mt-3 rounded-lg bg-crimson/15 px-3 py-2 text-sm text-ivory-fixed">
          내 기록 <b>{data.me.score}개</b> · 전체 <b>{data.me.rank}위</b>
          <span className="text-ivory-fixed/55"> / {data.totalPlayers}명 ({data.me.nickname})</span>
        </p>
      )}

      {status === "error" && (
        <p className="mt-4 text-sm text-ivory-fixed/60">
          랭킹을 불러오지 못했어요. 잠시 후 새로고침을 눌러 다시 시도해주세요.
        </p>
      )}

      {status !== "error" && data && data.top.length === 0 && (
        <p className="mt-4 text-sm text-ivory-fixed/60">
          아직 등록된 기록이 없어요. 첫 번째 기록의 주인공이 되어보세요!
        </p>
      )}

      {data && data.top.length > 0 && (
        <ol className="mt-4 divide-y divide-ivory-fixed/10">
          {data.top.map((entry, i) => (
            <li
              key={`${entry.rank}-${i}`}
              className={`flex items-center gap-3 px-2 py-2 text-sm ${
                entry.isMe ? "rounded-lg bg-crimson/20 text-ivory-fixed" : "text-ivory-fixed/80"
              }`}
            >
              <span
                className={`w-7 text-center font-mono text-xs font-bold ${
                  entry.rank <= 3 ? "text-[#F2C14E]" : "text-ivory-fixed/50"
                }`}
              >
                {entry.rank}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {entry.nickname}
                {entry.isMe && (
                  <span className="ml-2 rounded-full bg-crimson px-2 py-0.5 text-[10px] font-medium text-ivory-fixed">
                    나
                  </span>
                )}
              </span>
              <span className="font-mono text-xs text-ivory-fixed/50">LV {entry.level + 1}</span>
              <span className="w-14 text-right font-mono font-semibold">{entry.score}개</span>
            </li>
          ))}
        </ol>
      )}

      {run && run.score > 0 && (
        <div className="mt-5 border-t border-ivory-fixed/10 pt-5">
          {canSubmit && beatsMyRecord ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-ivory-fixed sm:flex-1">
                이번 기록 <b>{run.score}개</b>
                {myBest > 0 ? ` (내 등록 기록 ${myBest}개를 넘었어요!)` : ""} — 랭킹에 등록할까요?
              </p>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                required
                placeholder="닉네임 (12자 이내)"
                aria-label="닉네임"
                className="w-full rounded-full border border-ivory-fixed/25 bg-transparent px-4 py-2 text-sm text-ivory-fixed placeholder:text-ivory-fixed/40 focus:border-crimson-bright focus:outline-none sm:w-48"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-crimson px-5 py-2 text-sm font-medium text-ivory-fixed transition-colors hover:bg-crimson-deep disabled:opacity-60"
              >
                {pending ? "등록 중..." : "기록 등록"}
              </button>
            </form>
          ) : (
            !message &&
            submittedRunId !== run.id && (
              <p className="text-sm text-ivory-fixed/60">
                이번 기록 {run.score}개는 내 등록 기록({myBest}개)을 넘지 못해 등록하지 않아요.
              </p>
            )
          )}
          {message && <p className="text-sm font-medium text-crimson-bright">{message}</p>}
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-ivory-fixed/40">
        닉네임과 점수만 저장되며 계정은 필요 없어요. 같은 브라우저에서는 최고 기록 하나만 등록됩니다.
        부적절한 닉네임이나 비정상적인 기록은 삭제될 수 있어요.
      </p>
    </div>
  );
}
