"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCw, Trophy } from "lucide-react";
import {
  getLeaderboardAction,
  submitScoreAction,
  updateNicknameAction,
  type LeaderboardData,
} from "@/app/game/actions";
import { loadPlayerId } from "./gamePlayer";

export interface FinishedRun {
  /** 게임 오버마다 바뀌는 값 (같은 기록을 두 번 등록하지 않도록 구분) */
  id: number;
  score: number;
  durationMs: number;
}

export default function GameLeaderboard({
  run,
  nickname,
  nicknameChange,
  onTopScore,
  onAutoResult,
  onRequestNickname,
}: {
  run: FinishedRun | null;
  /** 설정된 닉네임 (없으면 기록이 자동 집계되지 않습니다) */
  nickname: string;
  /** 값이 바뀔 때마다 서버의 내 기록 닉네임도 함께 바꿉니다 (닉네임 변경 시각) */
  nicknameChange: number;
  /** 전체 1위 점수를 게임 화면(HUD)에 알려줍니다 */
  onTopScore: (score: number) => void;
  /** 이번 판의 자동 등록 결과 안내 문구 (게임 오버 화면에 표시) */
  onAutoResult: (message: string | null) => void;
  onRequestNickname: () => void;
}) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const playerIdRef = useRef<string>("");
  const autoSubmittedRef = useRef<number | null>(null);
  const lastNicknameChangeRef = useRef(nicknameChange);

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
    load();
  }, [load]);

  // 새 판을 시작하면 이전 안내를 지웁니다.
  useEffect(() => {
    if (run === null) {
      setError(null);
      onAutoResult(null);
    }
  }, [run, onAutoResult]);

  // 닉네임을 바꾸면 이미 등록된 내 기록의 닉네임도 함께 바꿉니다.
  useEffect(() => {
    if (nicknameChange === lastNicknameChangeRef.current) return;
    lastNicknameChangeRef.current = nicknameChange;
    if (!nickname || !playerIdRef.current) return;
    updateNicknameAction({ playerId: playerIdRef.current, nickname }).then((result) => {
      if (result.ok && result.data) applyData(result.data);
    });
  }, [nicknameChange, nickname, applyData]);

  const myBest = data?.me?.score ?? 0;

  // 게임이 끝나면(닉네임이 있을 때) 기록을 자동으로 순위에 등록합니다.
  useEffect(() => {
    if (!run || run.score < 1 || !nickname) return;
    if (autoSubmittedRef.current === run.id) return;
    if (status === "loading") return; // 내 기록을 불러온 뒤에 비교

    autoSubmittedRef.current = run.id;
    setError(null);

    if (status === "ready" && run.score <= myBest) {
      onAutoResult(`내 등록 기록(${myBest}개)을 넘지 못해 기존 기록이 유지돼요.`);
      return;
    }

    submitScoreAction({
      playerId: playerIdRef.current,
      nickname,
      score: run.score,
      durationMs: run.durationMs,
    }).then((result) => {
      if (!result.ok || !result.data) {
        setError(result.error ?? "기록 등록에 실패했습니다.");
        onAutoResult(null);
        return;
      }
      applyData(result.data);
      onAutoResult(
        result.improved
          ? `기록 ${run.score}개가 전체 ${result.data.me?.rank ?? "-"}위로 자동 등록됐어요!`
          : "이미 더 높은 기록이 등록되어 있어 기존 기록이 유지돼요."
      );
    });
  }, [run, nickname, status, myBest, applyData, onAutoResult]);

  const showNicknameCta = !nickname;

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
            <RotateCw
              size={12}
              strokeWidth={1.75}
              className={status === "loading" ? "animate-spin" : ""}
            />
            새로고침
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ivory-fixed/5 px-3 py-2 text-sm">
        {nickname ? (
          <span className="text-ivory-fixed/80">
            내 닉네임 <b className="text-ivory-fixed">{nickname}</b>
            <span className="text-ivory-fixed/50"> · 기록이 자동으로 집계돼요</span>
          </span>
        ) : (
          <span className="text-ivory-fixed/70">
            닉네임을 설정하면 게임 기록이 자동으로 순위에 집계돼요. (선택)
          </span>
        )}
        <button
          type="button"
          onClick={onRequestNickname}
          className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
            showNicknameCta
              ? "bg-crimson text-ivory-fixed hover:bg-crimson-deep"
              : "border border-ivory-fixed/25 text-ivory-fixed/80 hover:border-ivory-fixed/60 hover:text-ivory-fixed"
          }`}
        >
          {showNicknameCta ? "닉네임 설정" : "닉네임 변경"}
        </button>
      </div>

      {data?.me && (
        <p className="mt-3 rounded-lg bg-crimson/15 px-3 py-2 text-sm text-ivory-fixed">
          내 기록 <b>{data.me.score}개</b> · 전체 <b>{data.me.rank}위</b>
          <span className="text-ivory-fixed/55"> / {data.totalPlayers}명</span>
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

      {run && run.score > 0 && !nickname && (
        <p className="mt-4 border-t border-ivory-fixed/10 pt-4 text-sm text-ivory-fixed/70">
          이번 기록 <b className="text-ivory-fixed">{run.score}개</b>는 아직 순위에 등록되지 않았어요.
          닉네임을 설정하면 이번 기록도 바로 집계돼요.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <p className="mt-4 text-[11px] leading-relaxed text-ivory-fixed/40">
        닉네임과 점수만 저장되며 계정은 필요 없어요. 같은 브라우저에서는 최고 기록 하나만 등록됩니다.
        부적절한 닉네임이나 비정상적인 기록은 삭제될 수 있어요.
      </p>
    </div>
  );
}
