-- Supabase SQL Editor에 이 파일 내용을 그대로 붙여넣고 실행하세요.
-- (Supabase 대시보드 → SQL Editor → New query → 붙여넣기 → Run)

create extension if not exists "pgcrypto";

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('academic', 'council', 'event')),
  date date not null,
  end_date date,
  location text,
  organizer text,
  description text not null default '',
  created_at timestamptz not null default now()
);

-- 누구나 일정을 "조회"할 수 있도록 허용 (사이트 방문자용)
alter table schedules enable row level security;

drop policy if exists "Public can read schedules" on schedules;
create policy "Public can read schedules"
  on schedules
  for select
  using (true);

-- 등록/수정/삭제는 정책을 만들지 않습니다.
-- 관리자 페이지의 서버 액션은 Service Role Key를 사용해
-- RLS를 우회하므로 별도 정책이 없어도 동작합니다.
-- (Service Role Key는 절대 브라우저/클라이언트 코드에 노출되지 않습니다.)

create index if not exists schedules_date_idx on schedules (date);

-- ============================================================
-- Photo Archive 섹션: photos 테이블 + Storage 버킷
-- ============================================================

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  src text not null,
  storage_path text,
  date text not null,
  event_name text not null,
  photographer text not null,
  alt text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

-- 이미 photos 테이블이 있던 경우(승인 기능 추가 전)를 위한 안전한 마이그레이션.
-- not null/default 없이 컬럼만 먼저 추가해서 기존 행이 전부 'pending'으로
-- 백필되는 것을 막고, 기존에 이미 노출 중이던 사진은 'approved'로 채워줍니다.
alter table photos add column if not exists status text;
update photos set status = 'approved' where status is null;
alter table photos alter column status set default 'pending';
alter table photos alter column status set not null;
alter table photos drop constraint if exists photos_status_check;
alter table photos add constraint photos_status_check check (status in ('pending', 'approved'));

-- 승인된 사진만 사이트 방문자에게 노출합니다. 승인 대기 중인 사진은 관리자만 볼 수 있습니다
-- (관리자 페이지는 Service Role Key로 조회하므로 이 정책과 무관하게 전부 조회됩니다).
alter table photos enable row level security;

drop policy if exists "Public can read photos" on photos;
drop policy if exists "Public can read approved photos" on photos;
create policy "Public can read approved photos"
  on photos
  for select
  using (status = 'approved');

-- 업로드/승인/삭제는 정책을 만들지 않습니다.
-- /archive/actions.ts 의 서버 액션이 Service Role Key를 사용해
-- RLS를 우회하므로 별도 정책이 없어도 동작합니다.

create index if not exists photos_created_at_idx on photos (created_at desc);
create index if not exists photos_status_idx on photos (status);

-- 업로드된 사진 파일을 담을 공개 Storage 버킷 생성
-- (공개 버킷이라 별도 objects 정책 없이도 누구나 이미지를 읽을 수 있습니다.
--  업로드는 항상 Service Role Key를 쓰는 서버 액션에서만 이루어집니다.)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- 일정 알림(리마인더) 기능은 제거되었습니다.
-- 기존에 schedule_reminders 테이블을 만들었다면 아래 줄의 주석을 해제해서 정리하세요.
-- drop table if exists schedule_reminders;

-- ============================================================
-- 학생 홍보 게시판: promotions 테이블 + Storage 버킷
-- 동아리/행사/일일호프/리크루팅 홍보를 학생이 직접 올리고,
-- 관리자 승인 후에만 사이트에 노출됩니다.
-- ============================================================

create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('club', 'event', 'ilhof', 'recruit', 'etc')),
  title text not null,
  content text not null,
  author text not null,
  link text,
  image_src text,
  storage_path text,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

-- 승인된 홍보물만 사이트 방문자에게 노출합니다. 승인 대기 중인 글은 관리자만 볼 수 있습니다
-- (관리자 페이지는 Service Role Key로 조회하므로 이 정책과 무관하게 전부 조회됩니다).
alter table promotions enable row level security;

drop policy if exists "Public can read approved promotions" on promotions;
create policy "Public can read approved promotions"
  on promotions
  for select
  using (status = 'approved');

-- 업로드/승인/삭제는 정책을 만들지 않습니다.
-- /promotions/actions.ts 의 서버 액션이 Service Role Key를 사용해
-- RLS를 우회하므로 별도 정책이 없어도 동작합니다.

create index if not exists promotions_created_at_idx on promotions (created_at desc);
create index if not exists promotions_status_idx on promotions (status);

-- 홍보물 이미지를 담을 공개 Storage 버킷 생성
insert into storage.buckets (id, name, public)
values ('promotions', 'promotions', true)
on conflict (id) do nothing;

-- ============================================================
-- 업로더 연락처/신상 (선택 입력, 관리자 전용)
-- 사진 업로드·홍보 게시판에서 업로더가 선택적으로 남기는 전화번호와 신상 정보입니다.
-- photos/promotions 는 승인된 행이 anon 에게 select 로 공개되므로 같은 테이블에
-- 컬럼을 추가하면 개인정보가 노출될 수 있어, 정책이 전혀 없는(=관리자만 접근하는)
-- 별도 테이블에 저장합니다. 원본 행이 삭제되면 함께 삭제됩니다.
-- ============================================================

create table if not exists photo_submitters (
  photo_id uuid primary key references photos(id) on delete cascade,
  phone text,
  info text
);
alter table photo_submitters enable row level security;

create table if not exists promotion_submitters (
  promotion_id uuid primary key references promotions(id) on delete cascade,
  phone text,
  info text
);
alter table promotion_submitters enable row level security;

-- ============================================================
-- 익명 건의함: suggestions 테이블
-- 누구나 익명으로 학생회에 의견을 보낼 수 있고, 관리자만 열람합니다.
-- 사이트에 공개적으로 노출되는 게시판이 아니므로 승인 절차가 없습니다.
-- ============================================================

create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('학사', '시설', '학생회 운영', '기타')),
  content text not null,
  contact text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 익명 의견이라 공개 조회/등록 정책을 만들지 않습니다.
-- 제출은 /suggestions/actions.ts 서버 액션이, 조회/처리는 관리자 페이지가
-- 모두 Service Role Key로 접근하므로 별도 정책 없이도 동작합니다.
alter table suggestions enable row level security;

create index if not exists suggestions_created_at_idx on suggestions (created_at desc);
create index if not exists suggestions_is_read_idx on suggestions (is_read);

-- ============================================================
-- KUBS History Game 전체 랭킹: game_scores 테이블
-- 플레이어(브라우저)마다 최고 기록 1개만 저장합니다. 공개 정책이 없으므로
-- 등록/조회는 모두 /app/game/actions.ts 서버 액션(Service Role Key)이 처리합니다.
-- 잘못된(장난) 기록은 Supabase Table Editor에서 행을 삭제하면 랭킹에서 사라집니다.
-- ============================================================

create table if not exists game_scores (
  player_id uuid primary key,
  nickname text not null check (char_length(nickname) between 1 and 12),
  score integer not null check (score between 1 and 5000),
  level integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table game_scores enable row level security;

create index if not exists game_scores_score_idx on game_scores (score desc, updated_at asc);

-- ============================================================
-- KUBS History Game 학번 대항전: game_players 테이블 + 합산 함수/뷰
-- 플레이어(브라우저)마다 "선택한 학번"과 "지금까지 넘은 장애물 누적 개수"를 저장하고,
-- 학번별로 합산해서 경쟁합니다. 공개 정책이 없으므로 등록/조회는 모두
-- /app/game/actions.ts 서버 액션(Service Role Key)이 처리합니다.
-- ============================================================

create table if not exists game_players (
  player_id uuid primary key,
  cohort text not null check (cohort in ('26', '25', '24', '23', '22', '21', '20', '19', 'etc')),
  total_cleared integer not null default 0 check (total_cleared >= 0),
  runs integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table game_players enable row level security;

create index if not exists game_players_cohort_idx on game_players (cohort);

-- 한 판이 끝날 때마다 누적 개수를 원자적으로 더합니다. (동시에 여러 판이 끝나도 안전)
create or replace function record_game_run(p_player uuid, p_cohort text, p_cleared integer)
returns void
language plpgsql
as $$
begin
  insert into game_players (player_id, cohort, total_cleared, runs, updated_at)
  values (p_player, p_cohort, p_cleared, 1, now())
  on conflict (player_id) do update
    set cohort = excluded.cohort,
        total_cleared = game_players.total_cleared + excluded.total_cleared,
        runs = game_players.runs + 1,
        updated_at = now();
end;
$$;

-- 브라우저(anon/authenticated)에서 직접 호출하지 못하게 하고 서버(Service Role)만 쓰게 합니다.
revoke execute on function record_game_run(uuid, text, integer) from public, anon, authenticated;

-- 학번별 합산 결과
create or replace view game_cohort_totals as
  select cohort,
         sum(total_cleared)::bigint as total,
         count(*)::integer as players
  from game_players
  group by cohort;

revoke all on game_cohort_totals from anon, authenticated;
