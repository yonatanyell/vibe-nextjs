import type { SourceType } from "./platforms";

export const TMDB_MOVIE_GLOBAL_AVERAGE = 6.5;
export const TMDB_TV_GLOBAL_AVERAGE = 6.8;
export const TMDB_MOVIE_MIN_VOTES = 250;
export const TMDB_TV_MIN_VOTES = 100;
export const BOOK_GLOBAL_AVERAGE = 3.75;
export const GOOGLE_BOOKS_MIN_VOTES = 50;
export const OPEN_LIBRARY_MIN_VOTES = 25;
export const GOOGLE_BOOKS_QUALITY_WEIGHT = 0.65;
export const OPEN_LIBRARY_QUALITY_WEIGHT = 0.35;
export const NEUTRAL_QUALITY_SCORE = 0.5;

type QualityMetadata = {
  tmdb_vote_average?: string | number | null;
  tmdb_vote_count?: string | number | null;
  google_books_average_rating?: string | number | null;
  google_books_ratings_count?: string | number | null;
  open_library_average_rating?: string | number | null;
  open_library_ratings_count?: string | number | null;
};

function parseFloatNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (!value) return undefined;
  const normalized = String(value).replace(/,/g, "").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function weightedAverage(signals: { value: number | null; weight: number }[]) {
  const usable = signals.filter((signal): signal is { value: number; weight: number } =>
    signal.value !== null && Number.isFinite(signal.value),
  );
  const totalWeight = usable.reduce((sum, signal) => sum + signal.weight, 0);
  if (!totalWeight) return null;

  return usable.reduce((sum, signal) => sum + signal.value * signal.weight, 0) / totalWeight;
}

export function tmdbBayesianRatingScoreFor(sourceType: SourceType, meta: QualityMetadata) {
  if (sourceType !== "movie" && sourceType !== "tv") return null;

  const voteAverage = parseFloatNumber(meta.tmdb_vote_average);
  const voteCount = parseFloatNumber(meta.tmdb_vote_count);
  if (voteAverage === undefined || voteCount === undefined || voteCount < 0) return null;

  const globalAverage = sourceType === "movie" ? TMDB_MOVIE_GLOBAL_AVERAGE : TMDB_TV_GLOBAL_AVERAGE;
  const minVotes = sourceType === "movie" ? TMDB_MOVIE_MIN_VOTES : TMDB_TV_MIN_VOTES;
  const bayesianRating =
    (voteCount / (voteCount + minVotes)) * voteAverage +
    (minVotes / (voteCount + minVotes)) * globalAverage;

  return clamp01(bayesianRating / 10);
}

export function bookBayesianRatingScore(
  averageRating: number | undefined,
  ratingCount: number | undefined,
  minVotes: number,
) {
  if (averageRating === undefined || ratingCount === undefined || ratingCount < 0) return null;

  const bayesianRating =
    (ratingCount / (ratingCount + minVotes)) * averageRating +
    (minVotes / (ratingCount + minVotes)) * BOOK_GLOBAL_AVERAGE;

  return clamp01((bayesianRating - 1) / 4);
}

export function bookQualityScoreFor(meta: QualityMetadata) {
  const googleBooksScore = bookBayesianRatingScore(
    parseFloatNumber(meta.google_books_average_rating),
    parseFloatNumber(meta.google_books_ratings_count),
    GOOGLE_BOOKS_MIN_VOTES,
  );
  const openLibraryScore = bookBayesianRatingScore(
    parseFloatNumber(meta.open_library_average_rating),
    parseFloatNumber(meta.open_library_ratings_count),
    OPEN_LIBRARY_MIN_VOTES,
  );

  return weightedAverage([
    { value: googleBooksScore, weight: GOOGLE_BOOKS_QUALITY_WEIGHT },
    { value: openLibraryScore, weight: OPEN_LIBRARY_QUALITY_WEIGHT },
  ]);
}

export function qualityScoreFor(sourceType: SourceType, meta: QualityMetadata) {
  if (sourceType === "book") return bookQualityScoreFor(meta);
  if (sourceType === "podcast") return null;
  return tmdbBayesianRatingScoreFor(sourceType, meta);
}

export function qualityScoreUsedForScoring(qualityScore: number | null) {
  return qualityScore ?? NEUTRAL_QUALITY_SCORE;
}
