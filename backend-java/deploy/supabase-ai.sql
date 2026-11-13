-- Run in the existing Supabase project's SQL Editor, as postgres.
-- Separate private schema; do NOT add this schema to Data API exposed schemas.
begin;
create schema if not exists zhixu_backend;
revoke all on schema zhixu_backend from public, anon, authenticated;
create table if not exists zhixu_backend.ai_calls (
    request_id varchar(36) primary key,
    user_id varchar(36) not null,
    input_hash varchar(64) not null,
    day_key varchar(10) not null,
    created_at bigint not null,
    state varchar(16) not null,
    answer text
);
create index if not exists calls_user_day on zhixu_backend.ai_calls(user_id,day_key);
create index if not exists calls_recent on zhixu_backend.ai_calls(user_id,created_at);
create index if not exists calls_day on zhixu_backend.ai_calls(day_key);
alter table zhixu_backend.ai_calls enable row level security;
revoke all on all tables in schema zhixu_backend from public, anon, authenticated;
commit;
