-- 知序资料库 v1. 在 Supabase SQL Editor 执行。可重复执行，不改动原刷题记录。
begin;
create table if not exists public.zhixu_library_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.zhixu_library_admins enable row level security;
revoke all on public.zhixu_library_admins from anon, authenticated;
create or replace function public.zhixu_library_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.zhixu_library_admins where user_id = auth.uid());
$$;
revoke all on function public.zhixu_library_is_admin() from public;
grant execute on function public.zhixu_library_is_admin() to anon, authenticated;

create table if not exists public.zhixu_documents (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 160),
 category text not null default '个人笔记' check (char_length(category) between 1 and 80),
 kind text not null check (kind in ('markdown','text','pdf')),
 body text not null default '' check (octet_length(body) <= 2000000),
 plain_text text not null default '' check (octet_length(plain_text) <= 2000000),
 source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
 assets jsonb not null default '[]' check (jsonb_typeof(assets) = 'array' and jsonb_array_length(assets) <= 100 and octet_length(assets::text) < 100000),
 status text not null default 'draft' check (status in ('draft','published','archived')),
 revision bigint not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists zhixu_documents_dedupe on public.zhixu_documents(owner_id,source_hash) where status <> 'archived';
create index if not exists zhixu_documents_owner on public.zhixu_documents(owner_id,updated_at desc);
alter table public.zhixu_documents enable row level security;
revoke all on public.zhixu_documents from anon,authenticated;
grant select on public.zhixu_documents to anon,authenticated;
drop policy if exists zhixu_library_read on public.zhixu_documents;
-- 管理员也不直接阅读其他用户的私人草稿；只管理自己的内容和已公开内容。
create policy zhixu_library_read on public.zhixu_documents for select to anon,authenticated
using (status = 'published' or owner_id = (select auth.uid()));

create or replace function public.zhixu_library_save(p_id uuid,p_revision bigint,p_title text,p_category text,p_kind text,p_body text,p_plain text,p_hash text,p_assets jsonb,p_status text default 'draft')
returns public.zhixu_documents language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_doc public.zhixu_documents; v_admin boolean := public.zhixu_library_is_admin();
begin
 if v_uid is null then raise exception '请先登录' using errcode='42501'; end if;
 if p_status not in ('draft','published','archived') or p_status is null then raise exception '状态无效'; end if;
 select * into v_doc from public.zhixu_documents where id=p_id for update;
 if found then
  if v_doc.owner_id <> v_uid and not (v_admin and v_doc.status='published') then raise exception '没有访问权限' using errcode='42501'; end if;
  if v_doc.revision is distinct from p_revision then raise exception '资料已在其他设备更新，请重新打开后编辑' using errcode='40001'; end if;
  if (v_doc.status='published' or p_status='published') and not v_admin then raise exception '仅管理员可以发布或修改公开资料' using errcode='42501'; end if;
  update public.zhixu_documents set title=btrim(p_title),category=btrim(p_category),body=p_body,plain_text=p_plain,status=p_status,assets=p_assets,revision=revision+1,updated_at=now()
   where id=p_id returning * into v_doc;
 else
  if p_revision <> 0 or p_revision is null or p_status <> 'draft' then raise exception '新资料必须先保存为私人草稿'; end if;
  if (select count(*) from public.zhixu_documents where owner_id=v_uid) >= 500 then raise exception '已达到个人资料数量上限（含回收站 500 篇）'; end if;
  insert into public.zhixu_documents(id,owner_id,title,category,kind,body,plain_text,source_hash,assets)
   values(p_id,v_uid,btrim(p_title),btrim(p_category),p_kind,p_body,p_plain,p_hash,p_assets) returning * into v_doc;
 end if;
 return v_doc;
end; $$;
revoke all on function public.zhixu_library_save(uuid,bigint,text,text,text,text,text,text,jsonb,text) from public,anon;
grant execute on function public.zhixu_library_save(uuid,bigint,text,text,text,text,text,text,jsonb,text) to authenticated;

-- strpos 是字面匹配，对中文同样有效，百分号与下划线不会被解释成通配符。
create or replace function public.zhixu_library_search(p_query text,p_scope text default 'all',p_offset integer default 0)
returns table(id uuid,title text,category text,status text,snippet text,revision bigint)
language sql stable security invoker set search_path='' as $$
 select d.id,d.title,d.category,d.status,
 substring(d.plain_text from greatest(1,strpos(lower(d.plain_text),lower(btrim(p_query)))-80) for 360),d.revision
 from public.zhixu_documents d
 where char_length(btrim(p_query)) between 1 and 100 and d.status <> 'archived'
 and (p_scope='all' or (p_scope='mine' and d.owner_id=auth.uid()) or (p_scope='public' and d.status='published'))
 and (strpos(lower(d.title),lower(btrim(p_query)))>0 or strpos(lower(d.plain_text),lower(btrim(p_query)))>0)
 order by (strpos(lower(d.title),lower(btrim(p_query)))>0) desc,d.updated_at desc
 limit 30 offset least(10000,greatest(0,coalesce(p_offset,0)));
$$;
revoke all on function public.zhixu_library_search(text,text,integer) from public;
grant execute on function public.zhixu_library_search(text,text,integer) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('zhixu-library','zhixu-library',false,10485760,array['image/png','image/jpeg','image/webp','image/gif','application/pdf'])
 on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists zhixu_library_files_read on storage.objects;
create policy zhixu_library_files_read on storage.objects for select to anon,authenticated using (
 bucket_id='zhixu-library' and exists(select 1 from public.zhixu_documents d
 where d.id::text=(storage.foldername(name))[2] and d.owner_id::text=(storage.foldername(name))[1]
 and (d.status='published' or d.owner_id=auth.uid())));
drop policy if exists zhixu_library_files_insert on storage.objects;
create policy zhixu_library_files_insert on storage.objects for insert to authenticated with check (
 bucket_id='zhixu-library' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.zhixu_documents d where d.id::text=(storage.foldername(name))[2]
 and d.owner_id=auth.uid() and d.status='draft'));
drop policy if exists zhixu_library_files_delete on storage.objects;
create policy zhixu_library_files_delete on storage.objects for delete to authenticated using (
 bucket_id='zhixu-library' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.zhixu_documents d where d.id::text=(storage.foldername(name))[2]
 and d.owner_id=auth.uid() and d.status <> 'published'));
commit;

-- 执行完后，把实际管理员邮箱填入下列语句，单独执行（请不要把普通注册用户都设为管理员）：
-- insert into public.zhixu_library_admins(user_id)
-- select id from auth.users where email = '你的管理员邮箱' on conflict do nothing;
