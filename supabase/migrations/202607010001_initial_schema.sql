create extension if not exists vector;
create extension if not exists pgcrypto;

do $$
begin
  create type user_role as enum ('admin', 'employee');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type user_status as enum ('active', 'disabled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type assessment_status as enum ('in_progress', 'completed', 'abandoned');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type message_role as enum ('system', 'assistant', 'user');
exception
  when duplicate_object then null;
end $$;

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  employee_no text not null unique,
  name text not null,
  phone text not null unique,
  email text,
  position text,
  position_description text,
  level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  username text unique,
  phone text unique,
  password_hash text not null,
  role user_role not null,
  status user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_login_present check (username is not null or phone is not null)
);

create table if not exists employee_ai_profiles (
  employee_id uuid primary key references employees(id) on delete cascade,
  product_ability text,
  technical_ability text,
  project_experience text,
  profile_completion int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  status assessment_status not null default 'in_progress',
  current_round int not null default 0,
  total_rounds int not null default 10,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  abandoned_reason text
);

create table if not exists assessment_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references assessment_sessions(id) on delete cascade,
  round_no int not null,
  role message_role not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists assessment_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references assessment_sessions(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  score int not null check (score >= 0 and score <= 100),
  assessment_explanation text not null,
  structured_summary jsonb not null default '{}'::jsonb,
  is_latest boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists employee_embeddings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  chunk_type text not null,
  content text not null,
  embedding vector(1024) not null,
  source_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  imported_by uuid references app_users(id),
  status text not null default 'parsed',
  total_rows int not null default 0,
  success_rows int not null default 0,
  failed_rows int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  row_no int not null,
  employee_no text,
  raw_data jsonb not null,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_employees_employee_no on employees(employee_no);
create index if not exists idx_employees_phone on employees(phone);
create index if not exists idx_assessment_sessions_employee on assessment_sessions(employee_id);
create index if not exists idx_assessment_messages_session on assessment_messages(session_id, round_no, created_at);
create index if not exists idx_assessment_results_employee_latest on assessment_results(employee_id, is_latest);
create index if not exists idx_employee_embeddings_employee on employee_embeddings(employee_id);
create index if not exists idx_import_rows_batch on import_rows(batch_id);

do $$
begin
  create index idx_employee_embeddings_vector on employee_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
exception
  when duplicate_table then null;
end $$;

create or replace function match_employee_embeddings(
  query_embedding vector(1024),
  match_count int default 20
)
returns table (
  employee_id uuid,
  similarity double precision,
  matched_chunk_types text[],
  evidence text[]
)
language sql
stable
as $$
  with ranked_chunks as (
    select
      ee.employee_id,
      ee.chunk_type,
      ee.content,
      1 - (ee.embedding <=> query_embedding) as similarity,
      row_number() over (
        partition by ee.employee_id
        order by ee.embedding <=> query_embedding
      ) as chunk_rank
    from employee_embeddings ee
  ),
  ranked_employees as (
    select
      rc.employee_id,
      max(rc.similarity) as similarity
    from ranked_chunks rc
    group by rc.employee_id
    order by max(rc.similarity) desc
    limit match_count
  )
  select
    re.employee_id,
    re.similarity,
    array_agg(rc.chunk_type order by rc.chunk_rank) as matched_chunk_types,
    array_agg(rc.content order by rc.chunk_rank) filter (where rc.content is not null) as evidence
  from ranked_employees re
  join ranked_chunks rc on rc.employee_id = re.employee_id
  where rc.chunk_rank <= 3
  group by re.employee_id, re.similarity
  order by re.similarity desc;
$$;

insert into app_users (username, password_hash, role, status)
values ('admin', '$2b$10$XcOwC31w1YBESG1dx8UJLuPMGSjHbxUNfGKBjdcOdQUft4n6S3Vwu', 'admin', 'active')
on conflict (username) do nothing;
