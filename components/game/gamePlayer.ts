/** 랭킹에 쓰는 플레이어 식별 정보(브라우저 저장소). 저장소를 못 쓰는 환경에서도 에러 없이 동작합니다. */

const PLAYER_KEY = "kubs-game-player";
const NICK_KEY = "kubs-game-nick";
const SKIP_KEY = "kubs-game-nick-skip";

export const NICKNAME_MAX = 12;

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

export function loadPlayerId(): string {
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

export function readNickname(): string {
  try {
    return (localStorage.getItem(NICK_KEY) ?? "").trim().slice(0, NICKNAME_MAX);
  } catch {
    return "";
  }
}

export function writeNickname(nickname: string) {
  try {
    localStorage.setItem(NICK_KEY, nickname.trim().slice(0, NICKNAME_MAX));
    sessionStorage.removeItem(SKIP_KEY);
  } catch {
    /* 저장소를 못 쓰면 이번 방문 동안만 유지 */
  }
}

/** "그냥 시작하기"를 고른 경우, 이번 방문 동안은 다시 묻지 않습니다. */
export function readSkipped(): boolean {
  try {
    return sessionStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSkipped() {
  try {
    sessionStorage.setItem(SKIP_KEY, "1");
  } catch {
    /* 무시 */
  }
}
