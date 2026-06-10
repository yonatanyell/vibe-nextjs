-- Run this once in Supabase SQL Editor after the app is writing to:
-- user_events, user_item_interactions, recommendation_sessions, and recommendation_results.

drop table if exists public.usage_events;
drop function if exists public.match_mvp_trait_scores(extensions.vector(15), integer, text[]);
drop function if exists public.match_content_items(extensions.vector(15), integer, text[]);

