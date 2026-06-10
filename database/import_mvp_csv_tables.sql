create extension if not exists vector with schema extensions;

create table if not exists public.all_items_metadata (
  item_id text primary key,
  source_file text,
  source_row integer,
  show_title text,
  episode_title text,
  host_or_key_guest text,
  approximate_duration_minutes integer,
  primary_category text,
  episode_hook_theme text,
  popularity_rationale text,
  source_signals text,
  seed_category text,
  justification text,
  official_artwork_url text,
  apple_podcasts_episode_url text,
  spotify_episode_url text,
  imdb_rating text,
  rotten_tomatoes_rating text,
  year text,
  runtime text,
  number_of_seasons text,
  leading_actors text,
  israel_streaming_platforms text,
  format_type text,
  primary_genre text,
  pacing_velocity text,
  narrative_hook_summary text,
  cultural_signals text,
  psychological_justification text,
  netflix_url text,
  amazon_url text,
  disney_plus_url text,
  apple_tv_url text,
  hbo_max_url text,
  movie_title text,
  director text,
  movie_leading_actors text,
  release_year text,
  israel_subscription_platforms text,
  language text,
  official_trailer_url text,
  book_title text,
  author text,
  publication_year text,
  israel_accessibility_channels text,
  original_language text,
  goodreads_rating text,
  amazon_rating text,
  storygraph_rating text,
  page_count text,
  evrit_url text,
  evrit_hebrew_title text,
  kindle_url text,
  audible_url text,
  imported_at timestamptz not null default now()
);

create table if not exists public.all_items_traits_scores (
  item_id text primary key,
  source_type text not null,
  title text not null,
  duration text,
  duration_minutes integer,
  platform_keys text[] not null default '{}',
  psychological_justification text,
  cognitive_load smallint not null check (cognitive_load between 1 and 7),
  hedonic_pleasure smallint not null check (hedonic_pleasure between 1 and 7),
  eudaimonic_weight smallint not null check (eudaimonic_weight between 1 and 7),
  affective_arousal smallint not null check (affective_arousal between 1 and 7),
  comfort_and_emotional_safety smallint not null check (comfort_and_emotional_safety between 1 and 7),
  distress_and_unease smallint not null check (distress_and_unease between 1 and 7),
  narrative_velocity smallint not null check (narrative_velocity between 1 and 7),
  curiosity_and_mystery smallint not null check (curiosity_and_mystery between 1 and 7),
  immersive_texture smallint not null check (immersive_texture between 1 and 7),
  relational_warmth smallint not null check (relational_warmth between 1 and 7),
  parasocial_hangout_appeal smallint not null check (parasocial_hangout_appeal between 1 and 7),
  moral_complexity smallint not null check (moral_complexity between 1 and 7),
  ontological_instability smallint not null check (ontological_instability between 1 and 7),
  informational_utility smallint not null check (informational_utility between 1 and 7),
  identity_and_social_resonance smallint not null check (identity_and_social_resonance between 1 and 7),
  trait_vector extensions.vector(15) not null,
  imported_at timestamptz not null default now()
);

alter table public.all_items_traits_scores
  add column if not exists duration_minutes integer,
  add column if not exists platform_keys text[] not null default '{}';

create index if not exists all_items_metadata_source_file_idx on public.all_items_metadata (source_file);
create index if not exists all_items_traits_scores_source_type_idx on public.all_items_traits_scores (source_type);
create index if not exists all_items_traits_scores_duration_minutes_idx on public.all_items_traits_scores (duration_minutes);
create index if not exists all_items_traits_scores_platform_keys_gin_idx on public.all_items_traits_scores using gin (platform_keys);
create index if not exists all_items_traits_scores_trait_vector_hnsw_idx
  on public.all_items_traits_scores
  using hnsw (trait_vector vector_cosine_ops);

create or replace function public.match_all_items_traits_scores(
  query_vector extensions.vector(15),
  match_count integer default 20,
  source_types text[] default null
)
returns table (
  item_id text,
  source_type text,
  title text,
  duration text,
  psychological_justification text,
  similarity double precision
)
language sql
stable
as $$
  select
    s.item_id,
    s.source_type,
    s.title,
    s.duration,
    s.psychological_justification,
    1 - (s.trait_vector <=> query_vector) as similarity
  from public.all_items_traits_scores s
  where source_types is null or s.source_type = any(source_types)
  order by s.trait_vector <=> query_vector
  limit match_count;
$$;
