/**
 * 사진 업로드·홍보 게시판 폼에 공통으로 들어가는 선택 입력칸(전화번호, 신상 정보).
 * 값은 서버 액션에서 readSubmitterInfo()로 읽어 관리자 전용 테이블에 저장됩니다.
 */
export default function SubmitterFields() {
  return (
    <fieldset className="space-y-3 rounded-md border border-ivory-line p-4">
      <legend className="px-1 text-xs font-medium text-ink-soft">
        연락처 · 신상 (선택)
      </legend>
      <p className="text-xs leading-relaxed text-ink-faint">
        입력하지 않아도 등록할 수 있어요. 입력한 정보는 관리자만 확인하며
        사이트에 공개되지 않습니다.
      </p>

      <div>
        <label className="mb-1.5 block text-xs text-ink-faint">전화번호</label>
        <input
          type="tel"
          name="phone"
          autoComplete="tel"
          maxLength={20}
          placeholder="010-0000-0000"
          className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-ink-faint">신상 정보</label>
        <input
          name="info"
          maxLength={200}
          placeholder="이름 · 학과 · 학번 등"
          className="w-full rounded-md border border-ivory-line bg-ivory px-3 py-2 text-sm focus:border-crimson focus:outline-none"
        />
      </div>
    </fieldset>
  );
}
