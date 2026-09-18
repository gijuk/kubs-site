"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCw, Users } from "lucide-react";
import {
  getCohortBoardAction,
  recordRunAction,
  updateCohortAction,
  type CohortBoardData,
} from "@/app/game/actions";
import { cohortLabel } from "@/lib/data/gameCohorts";
import { loadPlayerId } from "./gamePlayer";
import type { FinishedRun } from "./GameLeaderboard";

const MEDAL = ["text-[#F2C14E]", "text-[#C9CED6]", "text-[#C98A5B]"];

/**
 * 학번 대항전: 같은 학번 학생들이 넘은 장애물 개수를 모두 합산해서 학번끼리 경쟁합니다.
 * 학번이 설정되어 있으면 한 판이 끝날 때마다 넘은 개수가 자동으로 합산됩니다.
 */
export default function CohortLeaderboard({
  run,
  cohort,
  cohortChange,
  onResult,
  onRequestProfile,
}: {
  run: FinishedRun | null;
  /** 설정된 학번 코드 (없으면 합산되지 않습니다) */
  cohort: string;
  /** 값이 바뀔 때마다 서버의 내 학번도 함께 바꿉니다 */
  cohortChange: number;
  /** 이번 판의 합산 결과 안내 문구 (게임 오버 화면에 표시) */
  onResult: (message: string | null) => void;
  onRequestProfile: () => void;
}) {
  const [data, setData] = useState<CohortBoardData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const playerIdRef = useRef("");
  const reportedRef = useRef<number | null>(null);
  const lastChangeRef = useRef(cohortChange);

  const load = useCallback(() => {
    setStatus("loading");
    getCohortBoardAction(playerIdRef.current).then((result) => {
      if (result) {
        setData(result);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    });
  }, []);

  useEffect(() => {
    playerIdRef.current = loadPlayerId();
    load();
  }, [load]);

  useEffect(() => {
    if (run === null) {
      setError(null);
      onResult(null);
    }
  }, [run, onResult]);

  // 학번을 바꾸면 이미 합산된 내 누적 개수도 새 학번으로 옮겨갑니다.
  useEffect(() => {
    if (cohortChange === lastChangeRef.current) return;
    lastChangeRef.current = cohortChange;
    if (!cohort || !playerIdRef.current) return;
    updateCohortAction({ playerId: playerIdRef.current, cohort }).then((result) => {
      if (result.ok && result.data) setData(result.data);
    });
  }, [cohortChange, cohort]);

  // 게임이 끝나면(학번이 있을 때) 넘은 장애물 개수를 내 학번에 자동으로 합산합니다.
  useEffect(() => {
    if (!run || run.score < 1 || !cohort) return;
    if (reportedRef.current === run.id) return;
    reportedRef.current = run.id;
    setError(null);

    recordRunAction({
      playerId: playerIdRef.current,
      cohort,
      cleared: run.score,
      durationMs: run.durationMs,
    }).then((result) => {
      if (!result.ok || !result.data) {
        setError(result.error ?? "학번 기록 합산에 실패했습니다.");
        onResult(null);
        return;
      }
      setData(result.data);
      setStatus("ready");
      const mine = result.data.cohorts.find((c) => c.code === cohort);
      onResult(
        `${cohortLabel(cohort)}에 +${run.score}개 합산! 우리 학번 총 ${mine?.total ?? "-"}개 (${mine?.rank ?? "-"}위)`
      );
    });
  }, [run, cohort, onResult]);

  const maxTotal = Math.max(1, ...(data?.cohorts.map((c) => c.total) ?? [1]));
  const grand = data?.cohorts.reduce((sum, c) => sum + c.total, 0) ?? 0;

  return (
    <div className="mt-6 w-full max-w-[1100px] rounded-2xl border border-ivory-fixed/15 bg-ivory-fixed/5 p-5 text-left sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-ivory-fixed">
          <Users size={18} strokeWidth={1.75} className="text-crimson-bright" />
          학번 대항전
          <span className="text-sm font-normal text-ivory-fixed/55">· 넘은 장애물 합계</span>
        </h3>
        <div className="flex items-center gap-3 text-xs text-ivory-fixed/55">
          {data && <span>전체 {grand.toLocaleString("ko-KR")}개</span>}
          <button
            type="button"
            onClick={load}
            disabled={status === "loading"}
            aria-label="학번 랭킹 새로고침"
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
        {cohort ? (
          <span className="text-ivory-fixed/80">
            내 학번 <b className="text-ivory-fixed">{cohortLabel(cohort)}</b>
            {data?.me && (
              <span className="text-ivory-fixed/50"> · 내가 보탠 장애물 {data.me.contributed}개</span>
            )}
          </span>
        ) : (
          <span className="text-ivory-fixed/70">
            학번을 설정하면 내가 넘은 장애물이 우리 학번 점수로 자동 합산돼요. (선택)
          </span>
        )}
        <button
          type="button"
          onClick={onRequestProfile}
          className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
            cohort
              ? "border border-ivory-fixed/25 text-ivory-fixed/80 hover:border-ivory-fixed/60 hover:text-ivory-fixed"
              : "bg-crimson text-ivory-fixed hover:bg-crimson-deep"
          }`}
        >
          {cohort ? "학번 변경" : "학번 설정"}
        </button>
      </div>

      {status === "error" && (
        <p className="mt-4 text-sm text-ivory-fixed/60">
          학번 랭킹을 불러오지 못했어요. 잠시 후 새로고침을 눌러 다시 시도해주세요.
        </p>
      )}

      {data && (
        <ol className="mt-4 space-y-2">
          {data.cohorts.map((c, i) => (
            <li
              key={c.code}
              className={`rounded-lg px-3 py-2 ${
                c.isMine ? "bg-crimson/20 ring-1 ring-crimson/60" : "bg-ivory-fixed/[0.03]"
              }`}
            >
              <div className="flex items-center gap-3 text-sm">
                <span
                  className={`w-6 text-center font-mono text-xs font-bold ${
                    c.total > 0 && c.rank <= 3 ? MEDAL[c.rank - 1] : "text-ivory-fixed/45"
                  }`}
                >
                  {c.total > 0 ? c.rank : "-"}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-ivory-fixed">
                  {cohortLabel(c.code)}
                  {c.isMine && (
                    <span className="ml-2 rounded-full bg-crimson px-2 py-0.5 text-[10px] font-medium">
                      내 학번
                    </span>
                  )}
                </span>
                <span className="hidden font-mono text-xs text-ivory-fixed/45 sm:inline">
                  {c.players}명
                  {c.players > 0 && ` · 1인 평균 ${(c.total / c.players).toFixed(1)}개`}
                </span>
                <span className="w-20 text-right font-mono font-semibold text-ivory-fixed">
                  {c.total.toLocaleString("ko-KR")}개
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ivory-fixed/10">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ${
                    i === 0 && c.total > 0 ? "bg-[#F2C14E]" : "bg-crimson-bright"
                  }`}
                  style={{ width: `${(c.total / maxTotal) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      {run && run.score > 0 && !cohort && (
        <p className="mt-4 border-t border-ivory-fixed/10 pt-4 text-sm text-ivory-fixed/70">
          이번에 넘은 장애물 <b className="text-ivory-fixed">{run.score}개</b>는 아직 어느 학번에도
          합산되지 않았어요. 학번을 설정하면 이번 기록도 바로 더해져요.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <p className="mt-4 text-[11px] leading-relaxed text-ivory-fixed/40">
        같은 학번 친구들이 게임에서 넘은 장애물 개수를 모두 더해 순위를 매겨요. 게임이 끝나는 시점에
        합산되며, 학번을 바꾸면 지금까지의 누적 개수도 함께 옮겨가요. 인원이 다르니 1인 평균도 함께
        보여드려요.
      </p>
    </div>
  );
}
