import { NextResponse } from "next/server";
import type { Recommendation, MediaType } from "@/lib/store";
import type { RecommendationFilters } from "@/lib/filters";
import {
  canonicalFilterPlatformLabels,
  canonicalPlatformLabels,
  platformKeysForFilters,
  sourceTypeForMediaType,
  type SourceType,
} from "@/lib/platforms";
import {
  BOOK_GLOBAL_AVERAGE,
  GOOGLE_BOOKS_MIN_VOTES,
  GOOGLE_BOOKS_QUALITY_WEIGHT,
  NEUTRAL_QUALITY_SCORE,
  OPEN_LIBRARY_MIN_VOTES,
  OPEN_LIBRARY_QUALITY_WEIGHT,
  TMDB_MOVIE_GLOBAL_AVERAGE,
  TMDB_MOVIE_MIN_VOTES,
  TMDB_TV_GLOBAL_AVERAGE,
  TMDB_TV_MIN_VOTES,
} from "@/lib/qualityScore";
import {
  BOOK_FRESHNESS_HALF_LIFE_DAYS,
  FRESHNESS_SCORE_WEIGHT,
  GOOGLE_BOOKS_RATINGS_COUNT_WEIGHT,
  MOVIE_FRESHNESS_HALF_LIFE_DAYS,
  OPEN_LIBRARY_AVAILABILITY_WEIGHT,
  OPEN_LIBRARY_EDITION_COUNT_WEIGHT,
  PODCAST_FRESHNESS_HALF_LIFE_DAYS,
  PODCAST_INDEX_EPISODE_COUNT_WEIGHT,
  PODCAST_INDEX_TREND_SCORE_WEIGHT,
  POPULARITY_SCORE_WEIGHT,
  PSYCHOLOGICAL_FIT_WEIGHT,
  QUALITY_SCORE_WEIGHT,
  rerankByPopularity,
  TMDB_POPULARITY_WEIGHT,
  TV_FRESHNESS_HALF_LIFE_DAYS,
  WATCHMODE_POPULARITY_WEIGHT,
  WATCHMODE_RELEVANCE_WEIGHT,
} from "@/lib/popularityScore";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const TRAIT_COUNT = 15;
const TRAIT_WEIGHT_MIN = 0;
const TRAIT_WEIGHT_MAX = 5;

type RecommendationRequestBody = {
  prompt?: unknown;
  traitVector?: unknown;
  traitWeights?: unknown;
  promptConstraints?: unknown;
  menuFilters?: unknown;
  filters?: unknown;
  limit?: unknown;
};

type TraitMatchRow = {
  item_id: string;
  source_type: SourceType;
  title: string;
  duration: string | null;
  duration_minutes?: number | null;
  platform_keys?: string[] | null;
  psychological_justification: string | null;
  similarity: number;
};

type TraitScoreRow = {
  item_id: string;
  source_type: SourceType;
  title: string;
  duration: string | null;
  duration_minutes: number | null;
  platform_keys: string[] | null;
  psychological_justification: string | null;
  cognitive_load: number;
  hedonic_pleasure: number;
  eudaimonic_weight: number;
  affective_arousal: number;
  comfort_and_emotional_safety: number;
  distress_and_unease: number;
  narrative_velocity: number;
  curiosity_and_mystery: number;
  immersive_texture: number;
  relational_warmth: number;
  parasocial_hangout_appeal: number;
  moral_complexity: number;
  ontological_instability: number;
  informational_utility: number;
  identity_and_social_resonance: number;
};

type MetadataRow = {
  item_id: string;
  show_title: string | null;
  episode_title: string | null;
  host_or_key_guest: string | null;
  approximate_duration_minutes: number | null;
  primary_category: string | null;
  episode_hook_theme: string | null;
  official_artwork_url: string | null;
  apple_podcasts_episode_url: string | null;
  spotify_episode_url: string | null;
  podcast_index_trend_score: string | number | null;
  podcast_index_episode_count: string | number | null;
  podcast_index_latest_episode_timestamp: string | number | null;
  tmdb_popularity: string | number | null;
  tmdb_vote_average: string | number | null;
  tmdb_vote_count: string | number | null;
  watchmode_popularity_percentile: string | number | null;
  watchmode_relevance_percentile: string | number | null;
  imdb_rating: string | null;
  rotten_tomatoes_rating: string | null;
  year: string | null;
  runtime: string | null;
  number_of_seasons: string | null;
  leading_actors: string | null;
  israel_streaming_platforms: string | null;
  format_type: string | null;
  primary_genre: string | null;
  narrative_hook_summary: string | null;
  netflix_url: string | null;
  amazon_url: string | null;
  disney_plus_url: string | null;
  apple_tv_url: string | null;
  hbo_max_url: string | null;
  movie_title: string | null;
  director: string | null;
  movie_leading_actors: string | null;
  release_year: string | null;
  israel_subscription_platforms: string | null;
  official_trailer_url: string | null;
  book_title: string | null;
  author: string | null;
  publication_year: string | null;
  israel_accessibility_channels: string | null;
  google_books_average_rating: string | number | null;
  google_books_ratings_count: string | number | null;
  open_library_average_rating: string | number | null;
  open_library_ratings_count: string | number | null;
  open_library_edition_count: string | number | null;
  open_library_availability_score: string | number | null;
  goodreads_rating: string | null;
  amazon_rating: string | null;
  storygraph_rating: string | null;
  page_count: string | null;
  evrit_url: string | null;
  kindle_url: string | null;
  audible_url: string | null;
};

const ACCENTS = ["#a78bda", "#8aa9d8", "#f0a48a", "#bdd994", "#f3b6c4", "#9cc9d6"];
const TRAIT_SCORE_COLUMNS = [
  "cognitive_load",
  "hedonic_pleasure",
  "eudaimonic_weight",
  "affective_arousal",
  "comfort_and_emotional_safety",
  "distress_and_unease",
  "narrative_velocity",
  "curiosity_and_mystery",
  "immersive_texture",
  "relational_warmth",
  "parasocial_hangout_appeal",
  "moral_complexity",
  "ontological_instability",
  "informational_utility",
  "identity_and_social_resonance",
] as const;
const WEIGHTED_CANDIDATE_COUNT = 50;

function asTraitVector(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.length !== 15 ||
    !value.every((score) => Number.isInteger(score) && score >= 1 && score <= 7)
  ) {
    return null;
  }

  return value;
}

function asTraitWeights(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.length !== TRAIT_COUNT ||
    !value.every((weight) => Number.isInteger(weight) && weight >= TRAIT_WEIGHT_MIN && weight <= TRAIT_WEIGHT_MAX)
  ) {
    return null;
  }

  return value;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asPlainObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asFilters(value: unknown): RecommendationFilters {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const candidate = value as Partial<RecommendationFilters>;
  return {
    types: Array.isArray(candidate.types) ? candidate.types.filter(isMediaType) : undefined,
    platforms: Array.isArray(candidate.platforms) ? uniqueNormalizedLabels(candidate.platforms) : undefined,
    minMinutes: typeof candidate.minMinutes === "number" ? candidate.minMinutes : undefined,
    maxMinutes: typeof candidate.maxMinutes === "number" ? candidate.maxMinutes : undefined,
  };
}

function isMediaType(value: unknown): value is MediaType {
  return value === "show" || value === "movie" || value === "podcast" || value === "book";
}

function sourceTypesFor(filters: RecommendationFilters): SourceType[] | null {
  if (!filters.types?.length) return null;
  return filters.types.map(sourceTypeForMediaType);
}

function summarizeCandidates(matches: TraitMatchRow[], count = 10) {
  return matches.slice(0, count).map((match, index) => ({
    rank: index + 1,
    itemId: match.item_id,
    sourceType: match.source_type,
    title: match.title,
    similarity: Number(match.similarity.toFixed(4)),
  }));
}

function mediaTypeFor(sourceType: TraitMatchRow["source_type"]): MediaType {
  return sourceType === "tv" ? "show" : sourceType;
}

function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (!value) return undefined;
  const match = String(value).match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : undefined;
}

function splitList(value: string | null | undefined) {
  if (!value) return [];
  const trimmed = value.trim();

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {}
  }

  return value
    .split(/;|,|\||\//)
    .map((part) => part.trim().replace(/^["'\[]+|["'\]]+$/g, ""))
    .filter(Boolean);
}

function uniqueNormalizedLabels(items: unknown[]) {
  return canonicalFilterPlatformLabels(items.filter((item): item is string => typeof item === "string"));
}

function platformsFor(meta: MetadataRow, type: MediaType) {
  const sourceType = sourceTypeForMediaType(type);
  if (type === "podcast") return canonicalPlatformLabels(["Apple Podcasts", "Spotify"].filter((platform) => {
    if (platform === "Apple Podcasts") return meta.apple_podcasts_episode_url;
    return meta.spotify_episode_url;
  }), sourceType);
  if (type === "book") {
    return canonicalPlatformLabels(
      splitList(meta.israel_accessibility_channels).concat(
        [
          meta.evrit_url ? "Evrit" : null,
          meta.kindle_url ? "Kindle Unlimited" : null,
          meta.audible_url ? "Audible" : null,
        ].filter((item): item is string => Boolean(item)),
      ),
      sourceType,
    );
  }
  return canonicalPlatformLabels(splitList(meta.israel_streaming_platforms || meta.israel_subscription_platforms), sourceType);
}

function ratingsFor(meta: MetadataRow, type: MediaType) {
  if (type === "book") {
    return [
      meta.goodreads_rating ? { source: "Goodreads", value: meta.goodreads_rating } : null,
      meta.amazon_rating ? { source: "Amazon", value: meta.amazon_rating } : null,
      meta.storygraph_rating ? { source: "StoryGraph", value: meta.storygraph_rating } : null,
    ].filter((rating): rating is { source: string; value: string } => Boolean(rating));
  }

  return [
    meta.imdb_rating ? { source: "IMDb", value: meta.imdb_rating } : null,
    meta.rotten_tomatoes_rating ? { source: "Rotten Tomatoes", value: meta.rotten_tomatoes_rating } : null,
  ].filter((rating): rating is { source: string; value: string } => Boolean(rating));
}

function lengthFor(match: Pick<TraitMatchRow, "duration" | "duration_minutes">, meta: MetadataRow, type: MediaType) {
  if (type === "podcast" && match.duration_minutes) return `${match.duration_minutes} min`;
  if (type === "movie" && match.duration_minutes) return `${match.duration_minutes} min`;
  if (type === "podcast" && meta.approximate_duration_minutes) return `${meta.approximate_duration_minutes} min`;
  if (type === "show" && meta.number_of_seasons) return `${meta.number_of_seasons} seasons`;
  if (type === "movie" && meta.runtime) return `${meta.runtime} min`;
  if (type === "book" && meta.page_count) return `${meta.page_count} pages`;
  return match.duration || "Length varies";
}

function durationMinutesFor(match: Pick<TraitMatchRow, "duration" | "duration_minutes">, meta: MetadataRow, type: MediaType) {
  if (typeof match.duration_minutes === "number") return match.duration_minutes;
  if (type === "podcast") return meta.approximate_duration_minutes ?? parseNumber(match.duration);
  if (type === "movie") return parseNumber(meta.runtime || match.duration);
  if (type === "show") return parseNumber(match.duration || meta.runtime);
  return undefined;
}

function tagsFor(meta: MetadataRow, type: MediaType) {
  const tags =
    type === "podcast"
      ? [meta.primary_category]
      : type === "book"
        ? splitList(meta.israel_accessibility_channels).slice(0, 1)
        : [meta.primary_genre, meta.format_type];

  return tags.filter((tag): tag is string => Boolean(tag)).slice(0, 3);
}

function posterFor(meta: MetadataRow, accent: string) {
  if (meta.official_artwork_url) return `linear-gradient(180deg, transparent 0%, rgba(0,0,0,.2) 65%), url("${meta.official_artwork_url}") center/cover`;
  return `linear-gradient(135deg, ${accent} 0%, #1f2937 100%)`;
}

function titleFor(match: TraitMatchRow, meta: MetadataRow, type: MediaType) {
  if (type === "podcast" && meta.show_title && meta.episode_title) return `${meta.show_title}: ${meta.episode_title}`;
  return meta.movie_title || meta.book_title || meta.show_title || match.title;
}

function creatorFor(meta: MetadataRow, type: MediaType) {
  if (type === "podcast") return meta.host_or_key_guest || "Podcast";
  if (type === "movie") return meta.director || "Film";
  if (type === "book") return meta.author || "Author";
  return meta.leading_actors || "TV";
}

function yearFor(meta: MetadataRow, type: MediaType) {
  return parseNumber(type === "book" ? meta.publication_year : type === "movie" ? meta.release_year : meta.year) ?? new Date().getFullYear();
}

function matchesDuration(rec: Recommendation, filters: RecommendationFilters) {
  if (rec.type === "book" || typeof rec.durationMinutes !== "number") return true;
  if (typeof filters.minMinutes === "number" && rec.durationMinutes < filters.minMinutes) return false;
  if (typeof filters.maxMinutes === "number" && rec.durationMinutes > filters.maxMinutes) return false;
  return true;
}

function hasDurationConstraint(filters: RecommendationFilters) {
  return typeof filters.minMinutes === "number" || typeof filters.maxMinutes === "number";
}

function hasTraitTableHardConstraint(filters: RecommendationFilters) {
  return hasDurationConstraint(filters) || Boolean(filters.platforms?.length);
}

function matchesHardFilters(match: TraitMatchRow | TraitScoreRow, filters: RecommendationFilters) {
  const type = mediaTypeFor(match.source_type);
  if (filters.types?.length && !filters.types.includes(type)) return false;
  if (filters.platforms?.length) {
    const available = match.platform_keys ?? [];
    const requested = platformKeysForFilters(filters.platforms, [match.source_type]);
    if (!requested.some((platform) => available.includes(platform))) return false;
  }
  if (type === "book") return true;

  const durationMinutes = match.duration_minutes;
  if (typeof durationMinutes !== "number") return true;
  if (typeof filters.minMinutes === "number" && durationMinutes < filters.minMinutes) return false;
  if (typeof filters.maxMinutes === "number" && durationMinutes > filters.maxMinutes) return false;
  return true;
}

function toRecommendation(match: TraitMatchRow, meta: MetadataRow, rank: number): Recommendation {
  const type = mediaTypeFor(match.source_type);
  const accent = ACCENTS[rank % ACCENTS.length];
  const tags = tagsFor(meta, type);
  const platforms = platformsFor(meta, type);

  return {
    id: match.item_id,
    type,
    title: titleFor(match, meta, type),
    creator: creatorFor(meta, type),
    year: yearFor(meta, type),
    cast: splitList(type === "movie" ? meta.movie_leading_actors : meta.leading_actors).slice(0, 3),
    platforms: platforms.length ? platforms : ["Availability varies"],
    ratings: ratingsFor(meta, type),
    length: lengthFor(match, meta, type),
    durationMinutes: durationMinutesFor(match, meta, type),
    tags: tags.length ? tags : [match.source_type],
    why: match.psychological_justification || `Strong cosine match (${Math.round(match.similarity * 100)}%).`,
    summary: meta.narrative_hook_summary || meta.episode_hook_theme || match.title,
    social: `Similarity ${Math.round(match.similarity * 100)}%`,
    poster: posterFor(meta, accent),
    accent,
  };
}

function cosineSimilarity(a: number[], b: number[], weights?: number[] | null) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const hasPositiveWeights = weights?.some((weight) => weight > 0) ?? false;

  for (let index = 0; index < a.length; index += 1) {
    const weight = hasPositiveWeights ? weights?.[index] ?? 0 : 1;
    dot += weight * a[index] * b[index];
    normA += weight * a[index] * a[index];
    normB += weight * b[index] * b[index];
  }

  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

function traitVectorFromRow(row: TraitScoreRow) {
  return TRAIT_SCORE_COLUMNS.map((column) => row[column]);
}

async function fetchTraitMatches(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  traitVector: number[],
  traitWeights: number[] | null,
  candidateCount: number,
  sourceTypes: SourceType[] | null,
) {
  const useWeightedScoring = traitWeights?.some((weight) => weight > 0) ?? false;

  if (!useWeightedScoring) {
    const rpcResult = await supabase.rpc("match_all_items_traits_scores", {
      query_vector: traitVector,
      match_count: candidateCount,
      source_types: sourceTypes,
    });

    if (!rpcResult.error) return { matches: (rpcResult.data ?? []) as TraitMatchRow[], error: null };

    if (rpcResult.error.code !== "PGRST202") {
      return { matches: null, error: rpcResult.error };
    }
  }

  let query = supabase
    .from("all_items_traits_scores")
    .select(
      [
        "item_id",
        "source_type",
        "title",
        "duration",
        "duration_minutes",
        "platform_keys",
        "psychological_justification",
        ...TRAIT_SCORE_COLUMNS,
      ].join(","),
    );

  if (sourceTypes?.length) query = query.in("source_type", sourceTypes);

  const { data, error } = await query;
  if (error) return { matches: null, error };

  const matches = ((data ?? []) as unknown as TraitScoreRow[])
    .map((row) => ({
      item_id: row.item_id,
      source_type: row.source_type,
      title: row.title,
      duration: row.duration,
      duration_minutes: row.duration_minutes,
      platform_keys: row.platform_keys,
      psychological_justification: row.psychological_justification,
      similarity: cosineSimilarity(traitVector, traitVectorFromRow(row), traitWeights),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, candidateCount);

  return { matches, error: null };
}

async function fetchMetadataByItemId(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  itemIds: string[],
) {
  if (!itemIds.length) return { metadataById: new Map<string, MetadataRow>(), error: null };

  const { data, error } = await supabase
    .from("all_items_metadata")
    .select("*")
    .in("item_id", itemIds);

  if (error) return { metadataById: null, error };

  return {
    metadataById: new Map((data ?? []).map((row) => [(row as MetadataRow).item_id, row as MetadataRow])),
    error: null,
  };
}

async function fetchHardFilteredTraitMatches(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  traitVector: number[],
  traitWeights: number[] | null,
  filters: RecommendationFilters,
  candidateCount: number,
  sourceTypes: SourceType[] | null,
) {
  let query = supabase
    .from("all_items_traits_scores")
    .select(
      [
        "item_id",
        "source_type",
        "title",
        "duration",
        "duration_minutes",
        "platform_keys",
        "psychological_justification",
        ...TRAIT_SCORE_COLUMNS,
      ].join(","),
    );

  if (sourceTypes?.length) query = query.in("source_type", sourceTypes);
  if (filters.platforms?.length) query = query.overlaps("platform_keys", platformKeysForFilters(filters.platforms, sourceTypes));

  const { data, error } = await query;
  if (error) return { matches: null, filteredCount: 0, error };

  const rows = (data ?? []) as unknown as TraitScoreRow[];
  const filteredRows = rows.filter((row) => matchesHardFilters(row, filters));
  const matches = filteredRows
    .map((row) => ({
      item_id: row.item_id,
      source_type: row.source_type,
      title: row.title,
      duration: row.duration,
      duration_minutes: row.duration_minutes,
      platform_keys: row.platform_keys,
      psychological_justification: row.psychological_justification,
      similarity: cosineSimilarity(traitVector, traitVectorFromRow(row), traitWeights),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, candidateCount);

  return { matches, filteredCount: filteredRows.length, error: null };
}

export async function POST(request: Request) {
  let body: RecommendationRequestBody;

  try {
    body = (await request.json()) as RecommendationRequestBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const traitVector = asTraitVector(body.traitVector);
  if (!traitVector) {
    return NextResponse.json({ error: "traitVector must include 15 integer scores from 1 to 7." }, { status: 400 });
  }

  const traitWeights = body.traitWeights === undefined ? null : asTraitWeights(body.traitWeights);
  if (body.traitWeights !== undefined && !traitWeights) {
    return NextResponse.json(
      { error: `traitWeights must include ${TRAIT_COUNT} integer weights from ${TRAIT_WEIGHT_MIN} to ${TRAIT_WEIGHT_MAX}.` },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const filters = asFilters(body.filters);
  const menuFilters = asFilters(body.menuFilters);
  const prompt = asOptionalString(body.prompt);
  const promptConstraints = asPlainObject(body.promptConstraints);
  const limit = typeof body.limit === "number" && body.limit > 0 ? Math.min(Math.floor(body.limit), 10) : 3;
  const sourceTypes = sourceTypesFor(filters);
  const candidateCount = WEIGHTED_CANDIDATE_COUNT;
  const needsTraitTableHardFiltering = hasTraitTableHardConstraint(filters);

  console.log(
    `[recommendations] request context ${JSON.stringify({
      prompt,
      promptTraitVector: traitVector,
      promptTraitWeights: traitWeights,
      promptConstraints,
      menuConstraints: menuFilters,
      finalConstraintsSentToSupabase: filters,
      sourceTypesSentToSupabase: sourceTypes,
      candidateCount,
      limit,
      hardFilterMode: needsTraitTableHardFiltering ? "trait-table" : "source-type-first",
    })}`,
  );

  const filteredResult = needsTraitTableHardFiltering
    ? await fetchHardFilteredTraitMatches(supabase, traitVector, traitWeights, filters, candidateCount, sourceTypes)
    : null;
  const { matches, error: matchError } =
    filteredResult ?? (await fetchTraitMatches(supabase, traitVector, traitWeights, candidateCount, sourceTypes));

  if (matchError) {
    console.error("[recommendations] vector match failed", matchError);
    return NextResponse.json({ error: "Could not match recommendations." }, { status: 500 });
  }

  const matchRows = matches ?? [];
  console.log(
    `[recommendations] cosine candidates ${JSON.stringify({
      prompt,
      totalCandidates: matchRows.length,
      totalHardFilteredItems: filteredResult?.filteredCount,
      scoring: traitWeights?.some((weight) => weight > 0) ? "weighted-cosine" : "cosine",
      candidates: summarizeCandidates(matchRows),
    })}`,
  );

  if (!matchRows.length) {
    return NextResponse.json({ recommendations: [], source: "supabase" });
  }

  const metadataResult =
    await fetchMetadataByItemId(
      supabase,
      matchRows.map((row) => row.item_id),
    );

  if (metadataResult.error || !metadataResult.metadataById) {
    console.error("[recommendations] metadata fetch failed", metadataResult.error);
    return NextResponse.json({ error: "Could not load recommendation metadata." }, { status: 500 });
  }

  const metadataById = metadataResult.metadataById;
  const rerankedCandidates = rerankByPopularity(matchRows, metadataById);
  console.log(
    `[recommendations] popularity rerank ${JSON.stringify({
      prompt,
      candidateItems: matchRows.length,
      rerankedItems: rerankedCandidates.length,
      weights: {
        psychologicalFit: PSYCHOLOGICAL_FIT_WEIGHT,
        quality: QUALITY_SCORE_WEIGHT,
        popularity: POPULARITY_SCORE_WEIGHT,
        freshness: FRESHNESS_SCORE_WEIGHT,
        tmdbPopularity: TMDB_POPULARITY_WEIGHT,
        watchmodePopularity: WATCHMODE_POPULARITY_WEIGHT,
        watchmodeRelevance: WATCHMODE_RELEVANCE_WEIGHT,
        googleBooksRatingsCount: GOOGLE_BOOKS_RATINGS_COUNT_WEIGHT,
        openLibraryEditionCount: OPEN_LIBRARY_EDITION_COUNT_WEIGHT,
        openLibraryAvailability: OPEN_LIBRARY_AVAILABILITY_WEIGHT,
        podcastIndexTrendScore: PODCAST_INDEX_TREND_SCORE_WEIGHT,
        podcastIndexEpisodeCount: PODCAST_INDEX_EPISODE_COUNT_WEIGHT,
        podcastFreshnessHalfLifeDays: PODCAST_FRESHNESS_HALF_LIFE_DAYS,
        movieFreshnessHalfLifeDays: MOVIE_FRESHNESS_HALF_LIFE_DAYS,
        tvFreshnessHalfLifeDays: TV_FRESHNESS_HALF_LIFE_DAYS,
        bookFreshnessHalfLifeDays: BOOK_FRESHNESS_HALF_LIFE_DAYS,
        qualitySignals: {
          tmdbMovieGlobalAverage: TMDB_MOVIE_GLOBAL_AVERAGE,
          tmdbTvGlobalAverage: TMDB_TV_GLOBAL_AVERAGE,
          tmdbMovieMinVotes: TMDB_MOVIE_MIN_VOTES,
          tmdbTvMinVotes: TMDB_TV_MIN_VOTES,
          bookGlobalAverage: BOOK_GLOBAL_AVERAGE,
          googleBooksMinVotes: GOOGLE_BOOKS_MIN_VOTES,
          openLibraryMinVotes: OPEN_LIBRARY_MIN_VOTES,
          googleBooksQuality: GOOGLE_BOOKS_QUALITY_WEIGHT,
          openLibraryQuality: OPEN_LIBRARY_QUALITY_WEIGHT,
          neutralQualityScore: NEUTRAL_QUALITY_SCORE,
        },
      },
      candidates: rerankedCandidates.slice(0, limit).map((candidate, index) => ({
        rank: index + 1,
        itemId: candidate.match.item_id,
        sourceType: candidate.match.source_type,
        title: candidate.match.title,
        similarity: Number(candidate.match.similarity.toFixed(4)),
        popularityScore:
          candidate.popularityScore === null ? null : Number(candidate.popularityScore.toFixed(4)),
        freshnessScore:
          candidate.freshnessScore === null ? null : Number(candidate.freshnessScore.toFixed(4)),
        qualityScore:
          candidate.qualityScore === null ? null : Number(candidate.qualityScore.toFixed(4)),
        qualityScoreUsed: Number(candidate.qualityScoreUsed.toFixed(4)),
        finalScore: Number(candidate.finalScore.toFixed(4)),
      })),
    })}`,
  );

  const recommendations = rerankedCandidates
    .map(({ match }, index) => {
      const meta = metadataById.get(match.item_id);
      return meta ? toRecommendation(match, meta, index) : null;
    })
    .filter((rec): rec is Recommendation => Boolean(rec))
    .filter((rec) => matchesDuration(rec, filters))
    .slice(0, limit);

  return NextResponse.json({
    recommendations,
    source: "supabase",
    diagnostics: {
      hardFilteredItems: filteredResult?.filteredCount,
      candidateItems: matchRows.length,
      popularityRerankedItems: rerankedCandidates.length,
      scoringSignals: rerankedCandidates.slice(0, limit).map((candidate) => ({
        itemId: candidate.match.item_id,
        sourceType: candidate.match.source_type,
        popularityScore: candidate.popularityScore,
        freshnessScore: candidate.freshnessScore,
        qualityScore: candidate.qualityScore,
        qualityScoreUsed: candidate.qualityScoreUsed,
      })),
    },
  });
}
