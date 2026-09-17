/**
 * 주어진 날짜(YYYY-MM-DD)까지 남은 일수를 D-day 라벨로 변환합니다.
 * 오늘이면 "D-DAY", 지난 날짜면 "D+n", 미래면 "D-n"을 반환합니다.
 */
export function getDday(dateStr: string): {
  label: string;
  diffDays: number;
  isPast: boolean;
  isToday: boolean;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: "D-DAY", diffDays, isPast: false, isToday: true };
  }
  if (diffDays > 0) {
    return { label: `D-${diffDays}`, diffDays, isPast: false, isToday: false };
  }
  return {
    label: `D+${Math.abs(diffDays)}`,
    diffDays,
    isPast: true,
    isToday: false,
  };
}

export function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}
