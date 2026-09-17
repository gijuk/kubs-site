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

-- ============================================================
-- 일정 알림(리마인더) 예약: schedule_reminders 테이블
-- 관심 있는 일정에 이메일을 등록하면 D-1에 Resend로 메일이 발송됩니다.
-- ============================================================

create table if not exists schedule_reminders (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  email text not null,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (schedule_id, email)
);

-- 이메일이 포함된 개인정보라 공개 조회/등록 정책을 만들지 않습니다.
-- 등록은 /schedule/actions.ts 서버 액션이, 발송은 /api/reminders 크론이
-- 모두 Service Role Key로 접근하므로 별도 정책 없이도 동작합니다.
alter table schedule_reminders enable row level security;

create index if not exists schedule_reminders_schedule_id_idx
  on schedule_reminders (schedule_id);
create index if not exists schedule_reminders_pending_idx
  on schedule_reminders (schedule_id)
  where notified_at is null;
