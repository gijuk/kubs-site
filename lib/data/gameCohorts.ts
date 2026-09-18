/** KUBS History Game 학번 대항전에서 고를 수 있는 학번(입학년도) 목록 */
export interface GameCohort {
  code: string;
  label: string;
}

export const GAME_COHORTS: GameCohort[] = [
  { code: "26", label: "26학번" },
  { code: "25", label: "25학번" },
  { code: "24", label: "24학번" },
  { code: "23", label: "23학번" },
  { code: "22", label: "22학번" },
  { code: "21", label: "21학번" },
  { code: "20", label: "20학번" },
  { code: "19", label: "19학번 이전" },
  { code: "etc", label: "대학원·기타" },
];

export function isCohortCode(value: unknown): value is string {
  return typeof value === "string" && GAME_COHORTS.some((c) => c.code === value);
}

export function cohortLabel(code: string): string {
  return GAME_COHORTS.find((c) => c.code === code)?.label ?? code;
}
