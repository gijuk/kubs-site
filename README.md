# KUBS, IN ONE PLACE

고려대학교 경영대학 학생들을 위한 비공식 정보 웹사이트입니다.

## 기술 스택

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- lucide-react

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 프로젝트 만들기 (일정 데이터 저장용)

1. [supabase.com](https://supabase.com) 에서 무료로 회원가입 후 "New project" 생성
2. 프로젝트가 만들어지면 왼쪽 메뉴 **SQL Editor** → New query 에 들어가서
   `supabase/schema.sql` 파일 내용을 그대로 붙여넣고 **Run** 실행
   (선택) 테스트용 샘플 데이터가 필요하면 `supabase/seed.sql` 내용도 이어서 실행
3. 왼쪽 메뉴 **Project Settings → API** 에서 아래 3가지 값을 복사
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 절대 외부에 공개하지 마세요)

### 3. 환경변수 설정

`.env.local.example` 파일을 복사해 `.env.local` 로 이름을 바꾸고, 위에서 복사한 값과
원하는 관리자 비밀번호(`ADMIN_PASSWORD`)를 채워 넣으세요.

```bash
cp .env.local.example .env.local
```

> Supabase 값을 아직 채우지 않아도 개발 서버는 실행됩니다 — 이 경우 일정 데이터는
> `lib/mock-data.ts`의 샘플 데이터로 표시되며, 실제 등록/수정/삭제는 동작하지 않습니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인하고, http://localhost:3000/admin 에서
`ADMIN_PASSWORD`로 로그인해 일정을 등록·수정·삭제해보세요.

## Vercel로 배포하기

1. 이 프로젝트를 GitHub 저장소에 올립니다 (`git init` → commit → push).
2. [vercel.com](https://vercel.com) 에 GitHub 계정으로 로그인 후 **Add New → Project**
   에서 방금 올린 저장소를 선택합니다.
3. "Environment Variables" 항목에 `.env.local`에 넣었던 4개 값
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`)을 그대로 등록합니다.
4. **Deploy** 클릭 → 몇 분 뒤 `https://프로젝트명.vercel.app` 주소가 발급됩니다.
5. 이후 관리자 페이지에서 일정을 등록하면 실제 배포된 사이트에도 그대로 반영됩니다.


## 폴더 구조

```
app/                      Next.js App Router 엔트리
  layout.tsx              루트 레이아웃 (폰트, 메타데이터)
  page.tsx                메인 페이지 (섹션 조합)
  globals.css             전역 스타일, 폰트 import
  schedule/page.tsx        전체 일정 페이지 (카테고리 필터)
  admin/
    page.tsx               관리자 대시보드 (일정 등록·수정·삭제)
    actions.ts             일정 CRUD 서버 액션 (Supabase 연동)
    ScheduleForm.tsx        등록/수정 폼
    AdminScheduleManager.tsx 목록 + 편집 상태 관리
    login/
      page.tsx              로그인 화면
      actions.ts            로그인/로그아웃 서버 액션 (쿠키 세션)

middleware.ts             /admin 접근 시 로그인 여부 확인

components/
  layout/                 Header, Footer
  hero/                   HERO 섹션
  schedule/               THIS WEEK 섹션 (일정 카드, 상세 모달, 목록, 필터)
  archive/                PHOTO ARCHIVE 섹션 (무한 스크롤)
  faq/                    FAQ 섹션 (검색, 카테고리 필터, 아코디언)
  map/                    KUBS MAP 섹션 (placeholder 구조)
  game/                   KUBS HISTORY GAME 섹션 (placeholder)

lib/
  types.ts                공용 타입 정의
  mock-data.ts            샘플 데이터 (Supabase 미설정 시 fallback)
  data/schedules.ts       일정 조회 로직 (Supabase ↔ mock 자동 전환)
  supabase/
    publicClient.ts        공개 조회용 클라이언트 (anon key)
    adminClient.ts          서버 전용 쓰기 클라이언트 (service role key)

supabase/
  schema.sql              테이블 생성 SQL
  seed.sql                (선택) 테스트용 샘플 데이터 SQL

hooks/
  useCountdown.ts         D-day 계산 유틸

.env.local.example        환경변수 예시 (복사해서 .env.local로 사용)
```

## 실제 데이터 연동 현황

- **일정 (완료)**: Supabase 연동이 완료되어 `/admin`에서 실제로 등록·수정·삭제할 수
  있고, 메인 페이지·전체 일정 페이지에 그대로 반영됩니다. 위 "시작하기" 섹션을
  따라 Supabase 프로젝트만 연결하면 바로 사용 가능합니다.
- **사진 아카이브**: 아직 mock 데이터(`lib/mock-data.ts`)로 표시됩니다. 실제
  업로드 기능은 Supabase Storage 연동으로 다음 단계에서 추가할 수 있습니다.
- **FAQ**: 아직 mock 데이터입니다. 항목이 자주 안 바뀐다면 지금처럼 코드에 두거나,
  일정처럼 Supabase 테이블로 옮겨 관리자 페이지에서 편집할 수 있습니다.
- **KUBS Map**: `components/map/KubsMapSection.tsx` 안의 placeholder 자리에
  실제 지도 컴포넌트(Kakao Map, Google Maps, 커스텀 SVG 등)를 넣으면 됩니다.
- **History Game**: `components/game/KubsHistoryGameSection.tsx`의
  placeholder를 실제 게임 캔버스/컴포넌트로 교체하세요.

## 관리자 페이지 보안 참고

지금 구현된 `/admin` 로그인은 비밀번호 하나로 보호하는 간단한 방식입니다.
학생회 내부용으로 빠르게 시작하기엔 충분하지만, 여러 명이 함께 관리하거나
더 안전하게 운영하고 싶다면 나중에 Supabase Auth(이메일/비밀번호 로그인,
계정별 권한 관리)로 업그레이드하는 것을 권장합니다.


## 디자인 토큰

`tailwind.config.ts`에 정의되어 있습니다.

- 배경: `ivory` (#FBF9F4), `ivory-soft` (#F5F1E9)
- 텍스트: `ink` (#1D1B18), `ink-soft`, `ink-faint`
- 포인트: `crimson` (#7A0C2E), `crimson-deep`, `crimson-bright`, `crimson-tint`
- 폰트: 헤드라인은 Noto Serif KR(`font-serif`), 본문/UI는 Pretendard(`font-sans`)
