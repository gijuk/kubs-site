const PHONE_RE = /^[0-9+\-\s()]{8,20}$/;

export interface SubmitterInfo {
  phone: string | null;
  info: string | null;
}

/**
 * 사진 업로드·홍보 게시판 폼의 선택 입력(전화번호, 신상 정보)을 읽고 검증합니다.
 * 둘 다 비워도 되며, 비어 있으면 null 을 돌려줍니다.
 */
export function readSubmitterInfo(formData: FormData): SubmitterInfo {
  const phone = String(formData.get("phone") ?? "").trim();
  const info = String(formData.get("info") ?? "").trim();

  if (phone && !PHONE_RE.test(phone)) {
    throw new Error("전화번호 형식을 확인해주세요. (예: 010-1234-5678)");
  }
  if (info.length > 200) {
    throw new Error("신상 정보는 200자 이내로 입력해주세요.");
  }

  return { phone: phone || null, info: info || null };
}
