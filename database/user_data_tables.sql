create extension if not exists vector with schema extensions;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  services text[] not null default '{}',
  preferred_source_types text[] not null default '{}',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  event_type text not null,
  item_id text references public.all_items_metadata(item_id) on delete set null,
  session_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (user_id is not null or anonymous_id is not null)
);

create table if not exists public.user_item_interactions (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  anonymous_id text,
  item_id text not null references public.all_items_metadata(item_id) on delete cascade,
  interaction_type text not null check (
    interaction_type in ('saved', 'unsaved', 'seen', 'unseen', 'dismissed', 'opened', 'clicked')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (user_id is not null or anonymous_id is not null)
);

create table if not exists public.recommendation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  prompt text not null,
  trait_vector extensions.vector(15),
  constraints jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (user_id is not null or anonymous_id is not null)
);

create table if not exists public.recommendation_results (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.recommendation_sessions(id) on delete cascade,
  item_id text not null references public.all_items_metadata(item_id) on delete cascade,
  rank integer not null check (rank > 0),
  similarity double precision,
  source_type text,
  metadata jsonb not null default '{}'::jsonb,
  shown_at timestamptz not null default now(),
  unique (session_id, item_id),
  unique (session_id, rank)
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists user_events_user_created_idx on public.user_events (user_id, created_at desc);
create index if not exists user_events_anonymous_created_idx on public.user_events (anonymous_id, created_at desc);
create index if not exists user_events_type_created_idx on public.user_events (event_type, created_at desc);
create index if not exists user_events_item_idx on public.user_events (item_id);
create index if not exists user_item_interactions_user_item_idx on public.user_item_interactions (user_id, item_id);
create index if not exists user_item_interactions_anonymous_item_idx on public.user_item_interactions (anonymous_id, item_id);
create index if not exists user_item_interactions_type_created_idx
  on public.user_item_interactions (interaction_type, created_at desc);
create index if not exists recommendation_sessions_user_created_idx
  on public.recommendation_sessions (user_id, created_at desc);
create index if not exists recommendation_sessions_anonymous_created_idx
  on public.recommendation_sessions (anonymous_id, created_at desc);
create index if not exists recommendation_sessions_trait_vector_hnsw_idx
  on public.recommendation_sessions
  using hnsw (trait_vector vector_cosine_ops)
  where trait_vector is not null;
create index if not exists recommendation_results_session_rank_idx
  on public.recommendation_results (session_id, rank);
create index if not exists recommendation_results_item_idx
  on public.recommendation_results (item_id);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_events enable row level security;
alter table public.user_item_interactions enable row level security;
alter table public.recommendation_sessions enable row level security;
alter table public.recommendation_results enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

drop trigger if exists user_preferences_touch_updated_at on public.user_preferences;
create trigger user_preferences_touch_updated_at
before update on public.user_preferences
for each row
execute function public.touch_updated_at();

