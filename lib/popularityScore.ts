import type { SourceType } from "./platforms";
import { qualityScoreFor, qualityScoreUsedForScoring } from "./qualityScore";

export const POPULARITY_RERANK_COUNT = 10;
export const PSYCHOLOGICAL_FIT_WEIGHT = 0.75;
export const QUALITY_SCORE_WEIGHT = 0.1;
export const POPULARITY_SCORE_WEIGHT = 0.1;
export const FRESHNESS_SCORE_WEIGHT = 0.05;
export const TMDB_POPULARITY_WEIGHT = 0.55;
export const WATCHMODE_POPULARITY_WEIGHT = 0.35;
export const WATCHMODE_RELEVANCE_WEIGHT = 0.1;
export const GOOGLE_BOOKS_RATINGS_COUNT_WEIGHT = 0.55;
export const OPEN_LIBRARY_EDITION_COUNT_WEIGHT = 0.3;
export const OPEN_LIBRARY_AVAILABILITY_WEIGHT = 0.15;
export const PODCAST_INDEX_TREND_SCORE_WEIGHT = 0.65;
export const PODCAST_INDEX_EPISODE_COUNT_WEIGHT = 0.35;
export const PODCAST_FRESHNESS_HALF_LIFE_DAYS = 30;
export const MOVIE_FRESHNESS_HALF_LIFE_DAYS = 365;
export const TV_FRESHNESS_HALF_LIFE_DAYS = 180;
export const BOOK_FRESHNESS_HALF_LIFE_DAYS = 730;
export const NEUTRAL_POPULARITY_SCORE = 0.5;
export const NEUTRAL_FRESHNESS_SCORE = 0.5;

export type PopularityMatch = {
  item_id: string;
  source_type: SourceType;
  similarity: number;
};

export type PopularityMetadata = {
  tmdb_popularity?: string | number | null;
  watchmode_popularity_percentile?: string | number | null;
  watchmode_relevance_percentile?: string | number | null;
  google_books_ratings_count?: string | number | null;
  open_library_edition_count?: string | number | null;
  open_library_availability_score?: string | number | null;
  podcast_index_trend_score?: string | number | null;
  podcast_index_episode_count?: string | number | null;
  podcast_index_latest_episode_timestamp?: string | number | null;
  release_year?: string | number | null;
  year?: string | number | null;
  publication_year?: string | number | null;
};

export type PopularityRerankedCandidate<T extends PopularityMatch> = {
  match: T;
  popularityScore: number | null;
  freshnessScore: number | null;
  qualityScore: number | null;
  qualityScoreUsed: number;
  finalScore: number;
};

export function parseFloatNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (!value) return undefined;
  const normalized = String(value).replace(/,/g, "").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseReleaseDate(value: string | number | null | undefined) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return new Date(Date.UTC(value, 6, 1));
  }

  if (!value) return null;
  const text = String(value).trim();
  const yearMonthDay = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (yearMonthDay) {
    const [, year, month, day] = yearMonthDay;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const yearMonth = text.match(/^(\d{4})-(\d{1,2})/);
  if (yearMonth) {
    const [, year, month] = yearMonth;
    return new Date(Date.UTC(Number(year), Number(month) - 1, 15));
  }

  const year = text.match(/\b(\d{4})\b/);
  return year ? new Date(Date.UTC(Number(year[1]), 6, 1)) : null;
}

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function percentile(values: number[], percentileValue: number) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return undefined;
  if (sorted.length === 1) return sorted[0];

  const index = (sorted.length - 1) * percentileValue;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const lower = sorted[lowerIndex];
  const upper = sorted[upperIndex];
  return lower + (upper - lower) * (index - lowerIndex);
}

export function weightedAverage(signals: { value: number | null; weight: number }[]) {
  const usable = signals.filter((signal): signal is { value: number; weight: number } =>
    signal.value !== null && Number.isFinite(signal.value),
  );
  const totalWeight = usable.reduce((sum, signal) => sum + signal.weight, 0);
  if (!totalWeight) return null;

  return usable.reduce((sum, signal) => sum + signal.value * signal.weight, 0) / totalWeight;
}

export function normalizeTmdbPopularity(value: number | undefined, cap: number | undefined) {
  if (value === undefined || value <= 0 || cap === undefined || cap <= 0) return null;
  return clamp01(Math.log1p(value) / Math.log1p(cap));
}

export function normalizeLongTailCount(value: number | undefined, cap: number | undefined) {
  if (value === undefined || cap === undefined || cap <= 0) return null;
  if (value <= 0) return 0;
  return clamp01(Math.log1p(value) / Math.log1p(cap));
}

export function normalizePercentile(value: number | undefined) {
  if (value === undefined) return null;
  return clamp01(value / 100);
}

export function normalizeUnitOrPercent(value: number | undefined) {
  if (value === undefined) return null;
  return clamp01(value > 1 ? value / 100 : value);
}

export function halfLifeFreshnessFromAge(ageDays: number, halfLifeDays: number) {
  if (!Number.isFinite(ageDays) || halfLifeDays <= 0) return null;
  return clamp01(0.5 ** (Math.max(0, ageDays) / halfLifeDays));
}

function ageDaysFromDate(date: Date | null, nowMs = Date.now()) {
  if (!date || Number.isNaN(date.getTime())) return null;
  return Math.max(0, nowMs - date.getTime()) / 86_400_000;
}

export function freshnessScoreFromDate(date: Date | null, halfLifeDays: number, nowMs = Date.now()) {
  const ageDays = ageDaysFromDate(date, nowMs);
  return ageDays === null ? null : halfLifeFreshnessFromAge(ageDays, halfLifeDays);
}

export function freshnessScoreFromTimestamp(timestampSeconds: number | undefined, halfLifeDays: number, nowMs = Date.now()) {
  if (timestampSeconds === undefined || timestampSeconds <= 0) return null;
  return freshnessScoreFromDate(new Date(timestampSeconds * 1000), halfLifeDays, nowMs);
}

export function freshnessScoreFor(match: PopularityMatch, meta: PopularityMetadata, nowMs = Date.now()) {
  if (match.source_type === "podcast") {
    return freshnessScoreFromTimestamp(
      parseFloatNumber(meta.podcast_index_latest_episode_timestamp),
      PODCAST_FRESHNESS_HALF_LIFE_DAYS,
      nowMs,
    );
  }

  if (match.source_type === "movie") {
    return freshnessScoreFromDate(parseReleaseDate(meta.release_year), MOVIE_FRESHNESS_HALF_LIFE_DAYS, nowMs);
  }

  if (match.source_type === "tv") {
    return freshnessScoreFromDate(parseReleaseDate(meta.year), TV_FRESHNESS_HALF_LIFE_DAYS, nowMs);
  }

  if (match.source_type === "book") {
    return freshnessScoreFromDate(parseReleaseDate(meta.publication_year), BOOK_FRESHNESS_HALF_LIFE_DAYS, nowMs);
  }

  return null;
}

function addPositiveValue(valuesByKey: Map<string, number[]>, key: string, value: number | undefined) {
  if (value === undefined || value <= 0) return;
  const values = valuesByKey.get(key) ?? [];
  values.push(value);
  valuesByKey.set(key, values);
}

export function capsFromValues(valuesByKey: Map<string, number[]>) {
  return new Map(
    Array.from(valuesByKey.entries()).map(([key, values]) => [
      key,
      percentile(values, 0.95) ?? Math.max(...values),
    ]),
  );
}

export function calculatePopularityCaps<T extends PopularityMatch>(
  matches: T[],
  metadataById: Map<string, PopularityMetadata>,
) {
  const valuesByKey = new Map<string, number[]>();

  for (const match of matches) {
    const meta = metadataById.get(match.item_id);
    if (!meta) continue;

    addPositiveValue(valuesByKey, `${match.source_type}:tmdb_popularity`, parseFloatNumber(meta.tmdb_popularity));
    if (match.source_type === "book") {
      addPositiveValue(valuesByKey, "book:google_books_ratings_count", parseFloatNumber(meta.google_books_ratings_count));
      addPositiveValue(valuesByKey, "book:open_library_edition_count", parseFloatNumber(meta.open_library_edition_count));
    } else if (match.source_type === "podcast") {
      addPositiveValue(valuesByKey, "podcast:podcast_index_trend_score", parseFloatNumber(meta.podcast_index_trend_score));
      addPositiveValue(valuesByKey, "podcast:podcast_index_episode_count", parseFloatNumber(meta.podcast_index_episode_count));
    }
  }

  return capsFromValues(valuesByKey);
}

export function movieOrTvPopularityScoreFor(match: PopularityMatch, meta: PopularityMetadata, caps: Map<string, number>) {
  const tmdbPopularityScore = normalizeTmdbPopularity(
    parseFloatNumber(meta.tmdb_popularity),
    caps.get(`${match.source_type}:tmdb_popularity`),
  );
  const watchmodePopularityScore = normalizePercentile(parseFloatNumber(meta.watchmode_popularity_percentile));
  const watchmodeRelevanceScore = normalizePercentile(parseFloatNumber(meta.watchmode_relevance_percentile));

  return weightedAverage([
    { value: tmdbPopularityScore, weight: TMDB_POPULARITY_WEIGHT },
    { value: watchmodePopularityScore, weight: WATCHMODE_POPULARITY_WEIGHT },
    { value: watchmodeRelevanceScore, weight: WATCHMODE_RELEVANCE_WEIGHT },
  ]);
}

export function bookPopularityScoreFor(meta: PopularityMetadata, caps: Map<string, number>) {
  const googleBooksRatingsCountScore = normalizeLongTailCount(
    parseFloatNumber(meta.google_books_ratings_count),
    caps.get("book:google_books_ratings_count"),
  );
  const openLibraryEditionCountScore = normalizeLongTailCount(
    parseFloatNumber(meta.open_library_edition_count),
    caps.get("book:open_library_edition_count"),
  );
  const openLibraryAvailabilityScore = normalizeUnitOrPercent(parseFloatNumber(meta.open_library_availability_score));

  return weightedAverage([
    { value: googleBooksRatingsCountScore, weight: GOOGLE_BOOKS_RATINGS_COUNT_WEIGHT },
    { value: openLibraryEditionCountScore, weight: OPEN_LIBRARY_EDITION_COUNT_WEIGHT },
    { value: openLibraryAvailabilityScore, weight: OPEN_LIBRARY_AVAILABILITY_WEIGHT },
  ]);
}

export function podcastPopularityScoreFor(meta: PopularityMetadata, caps: Map<string, number>) {
  const trendScore = normalizeLongTailCount(
    parseFloatNumber(meta.podcast_index_trend_score),
    caps.get("podcast:podcast_index_trend_score"),
  );
  const episodeCountScore = normalizeLongTailCount(
    parseFloatNumber(meta.podcast_index_episode_count),
    caps.get("podcast:podcast_index_episode_count"),
  );

  return weightedAverage([
    { value: trendScore, weight: PODCAST_INDEX_TREND_SCORE_WEIGHT },
    { value: episodeCountScore, weight: PODCAST_INDEX_EPISODE_COUNT_WEIGHT },
  ]);
}

export function popularityScoreFor(match: PopularityMatch, meta: PopularityMetadata, caps: Map<string, number>) {
  if (match.source_type === "book") return bookPopularityScoreFor(meta, caps);
  if (match.source_type === "podcast") return podcastPopularityScoreFor(meta, caps);
  if (match.source_type === "movie" || match.source_type === "tv") return movieOrTvPopularityScoreFor(match, meta, caps);
  return null;
}

export function rerankByPopularity<T extends PopularityMatch>(
  matches: T[],
  metadataById: Map<string, PopularityMetadata>,
  nowMs = Date.now(),
): PopularityRerankedCandidate<T>[] {
  const popularityCaps = calculatePopularityCaps(matches, metadataById);

  return matches
    .map((match) => {
      const meta = metadataById.get(match.item_id);
      const popularityScore = meta ? popularityScoreFor(match, meta, popularityCaps) : null;
      const freshnessScore = meta ? freshnessScoreFor(match, meta, nowMs) : null;
      const qualityScore = meta ? qualityScoreFor(match.source_type, meta) : null;
      const qualityScoreUsed = qualityScoreUsedForScoring(qualityScore);
      const finalScore =
        match.similarity * PSYCHOLOGICAL_FIT_WEIGHT +
        qualityScoreUsed * QUALITY_SCORE_WEIGHT +
        (popularityScore ?? NEUTRAL_POPULARITY_SCORE) * POPULARITY_SCORE_WEIGHT +
        (freshnessScore ?? NEUTRAL_FRESHNESS_SCORE) * FRESHNESS_SCORE_WEIGHT;

      return { match, popularityScore, freshnessScore, qualityScore, qualityScoreUsed, finalScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, POPULARITY_RERANK_COUNT);
}
