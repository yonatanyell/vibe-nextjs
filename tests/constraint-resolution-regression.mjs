import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const filtersPath = path.resolve("lib/filters.ts");
const platformsPath = path.resolve("lib/platforms.ts");
const source = fs.readFileSync(filtersPath, "utf8");
const platformsSource = fs.readFileSync(platformsPath, "utf8");
const compiledPlatforms = ts.transpileModule(platformsSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const sandbox = {
  exports: {},
  module: { exports: {} },
  URLSearchParams,
  require: (specifier) => {
    if (specifier === "./platforms") return platformsSandbox.module.exports;
    throw new Error(`Unexpected module import in constraint regression test: ${specifier}`);
  },
};
sandbox.exports = sandbox.module.exports;

const platformsSandbox = {
  exports: {},
  module: { exports: {} },
};
platformsSandbox.exports = platformsSandbox.module.exports;
vm.runInNewContext(compiledPlatforms, platformsSandbox, { filename: platformsPath });

vm.runInNewContext(compiled, sandbox, { filename: filtersPath });

const {
  applyRecommendationFilters,
  buildRecommendationUrl,
  describeFilters,
  isTimeFrame,
  parseTimeFrames,
  promptWithFilters,
  resolvePromptAndMenuConstraints,
  timeFrameLabel,
} = sandbox.module.exports;

const asArray = (value) => (value ? Array.from(value) : value);

function constraints(patch = {}) {
  return {
    mediaTypes: [],
    timeLimit: {
      mentioned: false,
      rawText: "",
    },
    platforms: [],
    languages: [],
    genres: [],
    moods: [],
    exclusions: [],
    otherConstraints: [],
    ...patch,
  };
}

const agreed = resolvePromptAndMenuConstraints(
  constraints({
    mediaTypes: ["movie"],
    timeLimit: {
      mentioned: true,
      rawText: "short",
      maxMinutes: 90,
    },
  }),
  { types: ["movie"], times: ["30-60"] },
);
assert.deepEqual(Array.from(agreed.filters.types), ["movie"]);
assert.deepEqual(Array.from(agreed.filters.times), ["60-120"]);
assert.equal(agreed.filters.maxMinutes, undefined);
assert.match(agreed.note, /60-120 min/);

const explicitMovieTime = resolvePromptAndMenuConstraints(
  constraints({
    mediaTypes: ["movie"],
    timeLimit: {
      mentioned: true,
      rawText: "under 90 minutes",
      maxMinutes: 90,
    },
  }),
  { types: ["movie"], times: ["60-plus"] },
);
assert.deepEqual(Array.from(explicitMovieTime.filters.types), ["movie"]);
assert.deepEqual(Array.from(explicitMovieTime.filters.times), ["60-plus"]);
assert.equal(explicitMovieTime.filters.maxMinutes, 90);
assert.equal(explicitMovieTime.note, undefined);

const longMovie = resolvePromptAndMenuConstraints(
  constraints({
    mediaTypes: ["movie"],
    timeLimit: {
      mentioned: true,
      rawText: "a long movie",
    },
  }),
  { types: ["movie"] },
);
assert.deepEqual(Array.from(longMovie.filters.types), ["movie"]);
assert.deepEqual(Array.from(longMovie.filters.times), ["120-plus"]);

const vagueShowTime = resolvePromptAndMenuConstraints(
  constraints({
    mediaTypes: ["show"],
    timeLimit: {
      mentioned: true,
      rawText: "a short episode",
      maxMinutes: 30,
    },
  }),
  { types: ["show"] },
);
assert.deepEqual(asArray(vagueShowTime.filters.types), ["show"]);
assert.equal(vagueShowTime.filters.times, undefined);
assert.equal(vagueShowTime.filters.maxMinutes, 30);

const specificTime = resolvePromptAndMenuConstraints(
  constraints({
    mediaTypes: ["show"],
    timeLimit: {
      mentioned: true,
      rawText: "20-minute sitcom episode",
      maxMinutes: 20,
    },
  }),
  { types: ["show"] },
);
assert.deepEqual(Array.from(specificTime.filters.types), ["show"]);
assert.equal(specificTime.filters.times, undefined);
assert.equal(specificTime.filters.maxMinutes, 20);

const timeContradiction = resolvePromptAndMenuConstraints(
  constraints({
    timeLimit: {
      mentioned: true,
      rawText: "under 20 minutes",
      maxMinutes: 20,
    },
  }),
  { times: ["60-plus"] },
);
assert.equal(timeContradiction.filters.times, undefined);
assert.equal(timeContradiction.filters.maxMinutes, 20);
assert.match(timeContradiction.note, /under 20 minutes/i);

const promptWins = resolvePromptAndMenuConstraints(
  constraints({
    mediaTypes: ["movie"],
  }),
  { types: ["book"] },
);
assert.deepEqual(Array.from(promptWins.filters.types), ["movie"]);
assert.match(promptWins.note, /contradicted/i);
assert.match(promptWins.note, /Movies/);

const intersection = resolvePromptAndMenuConstraints(
  constraints({
    mediaTypes: ["movie", "podcast"],
  }),
  { types: ["podcast"] },
);
assert.deepEqual(Array.from(intersection.filters.types), ["podcast"]);
assert.match(intersection.note, /differed/i);
assert.match(intersection.note, /Podcasts/);

const promptPlatformWins = resolvePromptAndMenuConstraints(
  constraints({
    platforms: ["Netflix Israel"],
  }),
  { platforms: ["Netflix", "Apple TV+"] },
);
assert.deepEqual(Array.from(promptPlatformWins.filters.platforms), ["Netflix"]);

const promptPlatformWinsOverSavedServices = resolvePromptAndMenuConstraints(
  constraints({
    platforms: ["Netflix"],
  }),
  { platforms: ["Disney+", "Apple TV+"] },
);
assert.deepEqual(Array.from(promptPlatformWinsOverSavedServices.filters.platforms), ["Netflix"]);
assert.equal(promptPlatformWinsOverSavedServices.note, undefined);

const servicesOnly = resolvePromptAndMenuConstraints(undefined, { platforms: ["HBO Max"] });
assert.deepEqual(Array.from(servicesOnly.filters.platforms), ["HBO Max"]);

const emptyIntersection = resolvePromptAndMenuConstraints(
  constraints({
    exclusions: ["no podcasts"],
  }),
  { types: ["podcast"] },
);
assert.equal(emptyIntersection.filters.types, undefined);
assert.match(emptyIntersection.note, /excluded Podcasts/i);

const noPromptConstraints = resolvePromptAndMenuConstraints(undefined, { types: ["book"], times: ["60-plus"] });
assert.deepEqual(asArray(noPromptConstraints.filters.types), ["book"]);
assert.deepEqual(asArray(noPromptConstraints.filters.times), ["60-plus"]);
assert.equal(noPromptConstraints.note, undefined);

assert.equal(isTimeFrame("60-120"), true);
assert.equal(isTimeFrame("120-plus"), true);
assert.equal(isTimeFrame("90-120"), false);
assert.deepEqual(asArray(parseTimeFrames(["60-120", "120-plus", "bogus"])), ["60-120", "120-plus"]);
assert.equal(timeFrameLabel(["60-120"]), "60-120 min");
assert.equal(describeFilters({ types: ["movie"], times: ["60-120"] }), "Movies - 60-120 min");
assert.equal(promptWithFilters("Find me something", { types: ["movie"], times: ["120-plus"] }), "Find me something (Movies, 120 minutes or more)");
assert.equal(buildRecommendationUrl("short movie", { types: ["movie"], times: ["60-120"] }), "/recommendations?q=short+movie&type=movie&time=60-120");

const catalog = [
  { id: "micro-podcast", type: "podcast", durationMinutes: 13 },
  { id: "short-podcast", type: "podcast", durationMinutes: 35 },
  { id: "short-film", type: "movie", durationMinutes: 45 },
  { id: "normal-movie", type: "movie", durationMinutes: 95 },
  { id: "long-movie", type: "movie", durationMinutes: 145 },
  { id: "show-episode", type: "show", durationMinutes: 45 },
  { id: "podcast-episode", type: "podcast", durationMinutes: 95 },
  { id: "long-book", type: "book", durationMinutes: 600 },
];

assert.deepEqual(
  asArray(applyRecommendationFilters(catalog, { types: ["movie"], times: ["60-120"] })).map((rec) => rec.id),
  ["normal-movie"],
);
assert.deepEqual(
  asArray(applyRecommendationFilters([{ id: "netflix", type: "movie", durationMinutes: 95, platforms: ["Netflix Israel"] }, { id: "apple", type: "movie", durationMinutes: 95, platforms: ["Apple TV+"] }], { platforms: ["Netflix"] })).map((rec) => rec.id),
  ["netflix"],
);
assert.deepEqual(
  asArray(applyRecommendationFilters(catalog, { types: ["movie"], times: ["120-plus"] })).map((rec) => rec.id),
  ["long-movie"],
);
assert.deepEqual(
  asArray(applyRecommendationFilters(catalog, { times: ["60-plus"] })).map((rec) => rec.id),
  ["normal-movie", "long-movie", "podcast-episode", "long-book"],
);
assert.deepEqual(
  asArray(applyRecommendationFilters(catalog, { times: ["15-30"] })).map((rec) => rec.id),
  ["micro-podcast", "short-podcast", "long-book"],
);
assert.deepEqual(
  asArray(applyRecommendationFilters(catalog, { times: ["under-15"] })).map((rec) => rec.id),
  ["micro-podcast", "long-book"],
);
assert.deepEqual(
  asArray(applyRecommendationFilters(catalog, { times: ["120-plus"] })).map((rec) => rec.id),
  ["long-movie", "long-book"],
);
assert.deepEqual(
  asArray(applyRecommendationFilters(catalog, { times: ["under-15", "120-plus"] })).map((rec) => rec.id),
  ["micro-podcast", "long-movie", "long-book"],
);
assert.deepEqual(
  asArray(applyRecommendationFilters(catalog, { times: ["60-plus"], maxMinutes: 90 })).map((rec) => rec.id),
  ["long-book"],
);
assert.deepEqual(
  asArray(applyRecommendationFilters(catalog, { maxMinutes: 100 })).map((rec) => rec.id),
  ["micro-podcast", "short-podcast", "short-film", "normal-movie", "show-episode", "podcast-episode", "long-book"],
);
assert.deepEqual(
  asArray(applyRecommendationFilters(catalog, { minMinutes: 100 })).map((rec) => rec.id),
  ["long-movie", "long-book"],
);

console.log("Constraint resolution regression passed.");
