import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const qualityScorePath = path.resolve("lib/qualityScore.ts");
const source = fs.readFileSync(qualityScorePath, "utf8");
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
};
sandbox.exports = sandbox.module.exports;

vm.runInNewContext(compiled, sandbox, { filename: qualityScorePath });

const {
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
  bookBayesianRatingScore,
  bookQualityScoreFor,
  qualityScoreFor,
  qualityScoreUsedForScoring,
  tmdbBayesianRatingScoreFor,
} = sandbox.module.exports;

const closeTo = (actual, expected, message) => {
  assert.equal(typeof actual, "number", message);
  assert.ok(Math.abs(actual - expected) < 1e-10, `${message}: expected ${expected}, received ${actual}`);
};

const tmdbExpected = (average, count, globalAverage, minVotes) =>
  ((count / (count + minVotes)) * average + (minVotes / (count + minVotes)) * globalAverage) / 10;

const bookExpected = (average, count, minVotes) =>
  ((count / (count + minVotes)) * average + (minVotes / (count + minVotes)) * BOOK_GLOBAL_AVERAGE - 1) / 4;

closeTo(
  tmdbBayesianRatingScoreFor("movie", {
    tmdb_vote_average: 8,
    tmdb_vote_count: 250,
  }),
  tmdbExpected(8, 250, TMDB_MOVIE_GLOBAL_AVERAGE, TMDB_MOVIE_MIN_VOTES),
  "Movie TMDB quality should use the movie Bayesian constants",
);

closeTo(
  tmdbBayesianRatingScoreFor("tv", {
    tmdb_vote_average: "8.2",
    tmdb_vote_count: "100",
  }),
  tmdbExpected(8.2, 100, TMDB_TV_GLOBAL_AVERAGE, TMDB_TV_MIN_VOTES),
  "TV TMDB quality should parse numeric strings and use TV constants",
);

closeTo(
  qualityScoreFor("movie", {
    tmdb_vote_average: 9,
    tmdb_vote_count: 0,
  }),
  TMDB_MOVIE_GLOBAL_AVERAGE / 10,
  "Zero-vote movie quality should shrink fully to the global average",
);

assert.equal(
  qualityScoreFor("movie", {
    tmdb_vote_average: 8,
    tmdb_vote_count: null,
  }),
  null,
  "Missing TMDB vote count should produce unknown movie quality",
);

closeTo(
  bookBayesianRatingScore(4.5, 50, GOOGLE_BOOKS_MIN_VOTES),
  bookExpected(4.5, 50, GOOGLE_BOOKS_MIN_VOTES),
  "Book Bayesian helper should shrink star ratings toward the book global average",
);

closeTo(
  bookQualityScoreFor({
    google_books_average_rating: 4.4,
    google_books_ratings_count: 100,
  }),
  bookExpected(4.4, 100, GOOGLE_BOOKS_MIN_VOTES),
  "Single-source book quality should use only the available source",
);

{
  const googleScore = bookExpected(4.4, 100, GOOGLE_BOOKS_MIN_VOTES);
  const openLibraryScore = bookExpected(4.0, 25, OPEN_LIBRARY_MIN_VOTES);
  const expected =
    (googleScore * GOOGLE_BOOKS_QUALITY_WEIGHT + openLibraryScore * OPEN_LIBRARY_QUALITY_WEIGHT) /
    (GOOGLE_BOOKS_QUALITY_WEIGHT + OPEN_LIBRARY_QUALITY_WEIGHT);

  closeTo(
    qualityScoreFor("book", {
      google_books_average_rating: "4.4",
      google_books_ratings_count: "100",
      open_library_average_rating: "4.0",
      open_library_ratings_count: "25",
    }),
    expected,
    "Book quality should weight Google Books and Open Library when both are available",
  );
}

assert.equal(
  qualityScoreFor("book", {
    google_books_average_rating: 4.2,
    google_books_ratings_count: null,
  }),
  null,
  "Book quality should be unknown without a usable rating count",
);

assert.equal(qualityScoreFor("podcast", {}), null, "Podcast quality should stay unknown");
assert.equal(qualityScoreUsedForScoring(null), NEUTRAL_QUALITY_SCORE, "Unknown quality should score neutrally");
assert.equal(qualityScoreUsedForScoring(0.82), 0.82, "Known quality should be used as-is");

console.log("Quality score regression passed: movie/TV, book, and podcast quality scoring are stable.");
