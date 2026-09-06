-- 人生。房產。學｜客戶人生地圖
-- Phase 1 schema

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- customers
-- ------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  nickname text,
  gender text,
  birth_year integer,
  age integer,
  occupation text,
  company text,
  industry text,
  phone text,
  contact_info text,
  relationship_level integer default 1 check (relationship_level between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- conversations
-- ------------------------------------------------------------
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_date timestamptz not null default now(),
  input_type text not null check (input_type in ('text', 'voice')),
  audio_url text,
  transcript text,
  summary text,
  ai_analysis jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- customer_profiles
-- ------------------------------------------------------------
create table if not exists customer_profiles (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null unique references customers(id) on delete cascade,
  family jsonb default '[]'::jsonb,
  work jsonb default '[]'::jsonb,
  finance jsonb default '{}'::jsonb,
  property jsonb default '{}'::jsonb,
  life_goals jsonb default '[]'::jsonb,
  concerns jsonb default '[]'::jsonb,
  resistance jsonb default '[]'::jsonb,
  decision_makers jsonb default '[]'::jsonb,
  competitors jsonb default '[]'::jsonb,
  preferences jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- next_actions
-- ------------------------------------------------------------
create table if not exists next_actions (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  question text,
  action text,
  avoid_topic text,
  follow_up_date date,
  status text default 'open' check (status in ('open', 'done', 'dismissed')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Row Level Security — each advisor only ever sees their own customers
-- ------------------------------------------------------------
alter table customers enable row level security;
alter table conversations enable row level security;
alter table customer_profiles enable row level security;
alter table next_actions enable row level security;

create policy "customers_owner_all" on customers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "conversations_owner_all" on conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "customer_profiles_owner_all" on customer_profiles
  for all using (
    exists (select 1 from customers c where c.id = customer_profiles.customer_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from customers c where c.id = customer_profiles.customer_id and c.user_id = auth.uid())
  );

create policy "next_actions_owner_all" on next_actions
  for all using (
    exists (select 1 from customers c where c.id = next_actions.customer_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from customers c where c.id = next_actions.customer_id and c.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- Private storage bucket for voice recordings (used from Phase 3)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('conversation-audio', 'conversation-audio', false)
on conflict (id) do nothing;

create policy "audio_owner_read" on storage.objects
  for select using (bucket_id = 'conversation-audio' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "audio_owner_write" on storage.objects
  for insert with check (bucket_id = 'conversation-audio' and auth.uid()::text = (storage.foldername(name))[1]);
