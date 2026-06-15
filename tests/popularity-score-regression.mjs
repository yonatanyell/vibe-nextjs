import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

function loadCommonJsModule(filePath, sandboxExtras = {}) {
  const source = fs.readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const sandbox = {
    exports: {},
    module: { exports: {} },
    console,
    Map,
    Date,
    Math,
    Number,
    ...sandboxExtras,
  };
  sandbox.exports = sandbox.module.exports;

  vm.runInNewContext(compiled, sandbox, { filename: filePath });
  return sandbox.module.exports;
}

const qualityScore = loadCommonJsModule(path.resolve("lib/qualityScore.ts"));
const popularityScore = loadCommonJsModule(path.resolve("lib/popularityScore.ts"), {
  require: (specifier) => {
    if (specifier === "./qualityScore") return qualityScore;
    throw new Error(`Unexpected module import in popularity score test: ${specifier}`);
  },
});

const {
  BOOK_FRESHNESS_HALF_LIFE_DAYS,
  FRESHNESS_SCORE_WEIGHT,
  GOOGLE_BOOKS_RATINGS_COUNT_WEIGHT,
  MOVIE_FRESHNESS_HALF_LIFE_DAYS,
  NEUTRAL_FRESHNESS_SCORE,
  NEUTRAL_POPULARITY_SCORE,
  OPEN_LIBRARY_AVAILABILITY_WEIGHT,
  OPEN_LIBRARY_EDITION_COUNT_WEIGHT,
  PODCAST_FRESHNESS_HALF_LIFE_DAYS,
  PODCAST_INDEX_EPISODE_COUNT_WEIGHT,
  PODCAST_INDEX_TREND_SCORE_WEIGHT,
  POPULARITY_RERANK_COUNT,
  POPULARITY_SCORE_WEIGHT,
  PSYCHOLOGICAL_FIT_WEIGHT,
  QUALITY_SCORE_WEIGHT,
  TMDB_POPULARITY_WEIGHT,
  WATCHMODE_POPULARITY_WEIGHT,
  WATCHMODE_RELEVANCE_WEIGHT,
  bookPopularityScoreFor,
  calculatePopularityCaps,
  freshnessScoreFromTimestamp,
  halfLifeFreshnessFromAge,
  movieOrTvPopularityScoreFor,
  normalizeLongTailCount,
  normalizePercentile,
  normalizeTmdbPopularity,
  normalizeUnitOrPercent,
  parseReleaseDate,
  podcastPopularityScoreFor,
  rerankByPopularity,
} = popularityScore;

const { NEUTRAL_QUALITY_SCORE } = qualityScore;

const closeTo = (actual, expected, message) => {
  assert.equal(typeof actual, "number", message);
  assert.ok(Math.abs(actual - expected) < 1e-10, `${message}: expected ${expected}, received ${actual}`);
};

assert.equal(POPULARITY_RERANK_COUNT, 10);
closeTo(
  PSYCHOLOGICAL_FIT_WEIGHT + QUALITY_SCORE_WEIGHT + POPULARITY_SCORE_WEIGHT + FRESHNESS_SCORE_WEIGHT,
  1,
  "Rerank weights should sum to 1",
);
assert.equal(PSYCHOLOGICAL_FIT_WEIGHT, 0.75);
assert.equal(QUALITY_SCORE_WEIGHT, 0.1);
assert.equal(POPULARITY_SCORE_WEIGHT, 0.1);
assert.equal(FRESHNESS_SCORE_WEIGHT, 0.05);
assert.equal(NEUTRAL_POPULARITY_SCORE, 0.5);
assert.equal(NEUTRAL_FRESHNESS_SCORE, 0.5);

assert.equal(normalizeLongTailCount(undefined, 100), null, "Missing count should stay unknown");
assert.equal(normalizeLongTailCount(0, 100), 0, "Zero count should be a real zero signal");
closeTo(normalizeLongTailCount(100, 100), 1, "A value at the cap should normalize to 1");
closeTo(normalizeLongTailCount(1_000, 100), 1, "Values above the cap should clamp to 1");
assert.equal(normalizeTmdbPopularity(0, 100), null, "Zero TMDB popularity should be unknown");
closeTo(normalizeTmdbPopularity(100, 100), 1, "TMDB popularity at cap should normalize to 1");
closeTo(normalizePercentile(125), 1, "Percentiles should clamp at 1");
closeTo(normalizeUnitOrPercent(85), 0.85, "Availability percent should normalize to a unit score");
closeTo(normalizeUnitOrPercent(0.6), 0.6, "Availability unit values should stay in unit scale");

{
  const caps = new Map([["movie:tmdb_popularity", 100]]);
  const score = movieOrTvPopularityScoreFor(
    { item_id: "movie-1", source_type: "movie", similarity: 0.9 },
    {
      tmdb_popularity: 100,
      watchmode_popularity_percentile: 80,
      watchmode_relevance_percentile: 50,
    },
    caps,
  );
  const expected =
    1 * TMDB_POPULARITY_WEIGHT +
    0.8 * WATCHMODE_POPULARITY_WEIGHT +
    0.5 * WATCHMODE_RELEVANCE_WEIGHT;
  closeTo(score, expected, "Movie popularity should blend TMDB and Watchmode signals");
}

{
  const caps = new Map([
    ["book:google_books_ratings_count", 1_000],
    ["book:open_library_edition_count", 100],
  ]);
  const score = bookPopularityScoreFor(
    {
      google_books_ratings_count: 1_000,
      open_library_edition_count: 100,
      open_library_availability_score: 85,
    },
    caps,
  );
  const expected =
    1 * GOOGLE_BOOKS_RATINGS_COUNT_WEIGHT +
    1 * OPEN_LIBRARY_EDITION_COUNT_WEIGHT +
    0.85 * OPEN_LIBRARY_AVAILABILITY_WEIGHT;
  closeTo(score, expected, "Book popularity should blend free API count and availability signals");
}

{
  const caps = new Map([
    ["podcast:podcast_index_trend_score", 500],
    ["podcast:podcast_index_episode_count", 1_000],
  ]);
  const score = podcastPopularityScoreFor(
    {
      podcast_index_trend_score: 500,
      podcast_index_episode_count: 1_000,
    },
    caps,
  );
  const expected = 1 * PODCAST_INDEX_TREND_SCORE_WEIGHT + 1 * PODCAST_INDEX_EPISODE_COUNT_WEIGHT;
  closeTo(score, expected, "Podcast popularity should blend Podcast Index trend and episode-count signals");
}

closeTo(halfLifeFreshnessFromAge(30, 30), 0.5, "Freshness should halve at one half-life");
{
  const nowMs = Date.UTC(2026, 5, 15);
  const thirtyDaysAgo = Math.floor((nowMs - 30 * 86_400_000) / 1000);
  closeTo(
    freshnessScoreFromTimestamp(thirtyDaysAgo, PODCAST_FRESHNESS_HALF_LIFE_DAYS, nowMs),
    0.5,
    "Podcast timestamp freshness should use the podcast half-life",
  );
}

assert.equal(parseReleaseDate("2024")?.toISOString(), "2024-07-01T00:00:00.000Z");
assert.equal(parseReleaseDate("2024-03")?.toISOString(), "2024-03-15T00:00:00.000Z");
assert.equal(parseReleaseDate("2024-03-02")?.toISOString(), "2024-03-02T00:00:00.000Z");

{
  const matches = [
    { item_id: "m1", source_type: "movie", similarity: 0.9 },
    { item_id: "m2", source_type: "movie", similarity: 0.9 },
    { item_id: "b1", source_type: "book", similarity: 0.9 },
    { item_id: "p1", source_type: "podcast", similarity: 0.9 },
  ];
  const metadataById = new Map([
    ["m1", { tmdb_popularity: 10 }],
    ["m2", { tmdb_popularity: 20 }],
    ["b1", { google_books_ratings_count: 50, open_library_edition_count: 5 }],
    ["p1", { podcast_index_trend_score: 7, podcast_index_episode_count: 100 }],
  ]);
  const caps = calculatePopularityCaps(matches, metadataById);
  assert.equal(caps.get("movie:tmdb_popularity"), 19.5);
  assert.equal(caps.get("book:google_books_ratings_count"), 50);
  assert.equal(caps.get("book:open_library_edition_count"), 5);
  assert.equal(caps.get("podcast:podcast_index_trend_score"), 7);
}

{
  const nowMs = Date.UTC(2026, 5, 15);
  const recentTimestamp = Math.floor((nowMs - 5 * 86_400_000) / 1000);
  const oldTimestamp = Math.floor((nowMs - 90 * 86_400_000) / 1000);
  const matches = [
    { item_id: "popular", source_type: "podcast", similarity: 0.9 },
    { item_id: "obscure", source_type: "podcast", similarity: 0.9 },
  ];
  const metadataById = new Map([
    [
      "popular",
      {
        podcast_index_trend_score: 100,
        podcast_index_episode_count: 1_000,
        podcast_index_latest_episode_timestamp: recentTimestamp,
      },
    ],
    [
      "obscure",
      {
        podcast_index_trend_score: 0,
        podcast_index_episode_count: 1,
        podcast_index_latest_episode_timestamp: oldTimestamp,
      },
    ],
  ]);
  const [first, second] = rerankByPopularity(matches, metadataById, nowMs);
  assert.equal(first.match.item_id, "popular", "Popularity rerank should promote the stronger podcast popularity signals");
  assert.equal(second.match.item_id, "obscure");
  assert.ok(first.finalScore > second.finalScore, "Final score should reflect popularity/freshness after equal similarity");
}

{
  const nowMs = Date.UTC(2026, 5, 15);
  const matches = [{ item_id: "missing-meta", source_type: "movie", similarity: 0.8 }];
  const [candidate] = rerankByPopularity(matches, new Map(), nowMs);
  const expected =
    0.8 * PSYCHOLOGICAL_FIT_WEIGHT +
    NEUTRAL_QUALITY_SCORE * QUALITY_SCORE_WEIGHT +
    NEUTRAL_POPULARITY_SCORE * POPULARITY_SCORE_WEIGHT +
    NEUTRAL_FRESHNESS_SCORE * FRESHNESS_SCORE_WEIGHT;
  closeTo(candidate.finalScore, expected, "Missing metadata should use neutral quality, popularity, and freshness");
}

assert.ok(MOVIE_FRESHNESS_HALF_LIFE_DAYS > PODCAST_FRESHNESS_HALF_LIFE_DAYS);
assert.ok(BOOK_FRESHNESS_HALF_LIFE_DAYS > MOVIE_FRESHNESS_HALF_LIFE_DAYS);

console.log("Popularity score regression passed: movie/TV, book, podcast, freshness, and reranking are stable.");
