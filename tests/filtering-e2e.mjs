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
    console: { ...console, log: () => {}, error: () => {} },
    URL,
    URLSearchParams,
    Request,
    Response,
    ...sandboxExtras,
  };
  sandbox.exports = sandbox.module.exports;

  vm.runInNewContext(compiled, sandbox, { filename: filePath });
  return { exports: sandbox.module.exports, sandbox };
}

const platforms = loadCommonJsModule(path.resolve("lib/platforms.ts")).exports;

const traitColumns = [
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
];

const defaultVector = [3, 5, 3, 4, 4, 2, 5, 3, 4, 3, 3, 2, 2, 2, 3];
const defaultWeights = [1, 5, 1, 2, 4, 4, 5, 1, 2, 1, 1, 0, 0, 0, 1];

function traitRow(itemId, sourceType, title, vector = defaultVector, patch = {}) {
  const row = {
    item_id: itemId,
    source_type: sourceType,
    title,
    duration: null,
    duration_minutes: null,
    platform_keys: [],
    psychological_justification: `${title} matches the prompt.`,
    ...patch,
  };

  traitColumns.forEach((column, index) => {
    row[column] = vector[index];
  });

  return row;
}

function metadataRow(itemId, patch = {}) {
  return {
    item_id: itemId,
    show_title: null,
    episode_title: null,
    host_or_key_guest: null,
    approximate_duration_minutes: null,
    primary_category: null,
    episode_hook_theme: null,
    official_artwork_url: null,
    apple_podcasts_episode_url: null,
    spotify_episode_url: null,
    imdb_rating: null,
    rotten_tomatoes_rating: null,
    year: "2024",
    runtime: null,
    number_of_seasons: null,
    leading_actors: null,
    israel_streaming_platforms: null,
    format_type: null,
    primary_genre: null,
    narrative_hook_summary: null,
    netflix_url: null,
    amazon_url: null,
    disney_plus_url: null,
    apple_tv_url: null,
    hbo_max_url: null,
    movie_title: null,
    director: null,
    movie_leading_actors: null,
    release_year: "2024",
    israel_subscription_platforms: null,
    official_trailer_url: null,
    book_title: null,
    author: null,
    publication_year: "2024",
    israel_accessibility_channels: null,
    goodreads_rating: null,
    amazon_rating: null,
    storygraph_rating: null,
    page_count: null,
    evrit_url: null,
    kindle_url: null,
    audible_url: null,
    ...patch,
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

class MockQuery {
  constructor(table, data) {
    this.table = table;
    this.data = data;
    this.filters = [];
  }

  select() {
    return this;
  }

  in(column, values) {
    this.filters.push({ column, values });
    return this;
  }

  overlaps(column, values) {
    this.filters.push({ column, values, type: "overlaps" });
    return this;
  }

  execute() {
    let rows = this.data[this.table] ?? [];
    this.filters.forEach(({ column, values, type }) => {
      if (type === "overlaps") {
        rows = rows.filter((row) => Array.isArray(row[column]) && row[column].some((value) => values.includes(value)));
      } else {
        rows = rows.filter((row) => values.includes(row[column]));
      }
    });
    return { data: rows, error: null };
  }

  then(resolve, reject) {
    return Promise.resolve(this.execute()).then(resolve, reject);
  }
}

function createSupabaseMock({ traitRows, metadataRows }) {
  const data = {
    all_items_traits_scores: traitRows,
    all_items_metadata: metadataRows,
  };

  return {
    rpc: async () => ({ data: null, error: { code: "PGRST202" } }),
    from: (table) => new MockQuery(table, data),
  };
}

let currentSupabase = null;
let currentGeminiPayload = null;

const translator = loadCommonJsModule(path.resolve("lib/psychometricTranslator.ts"), {
  process: {
    env: {
      GEMINI_API_KEY: "test-key",
      GEMINI_TRAIT_MODEL: "trait-model",
      GEMINI_CONSTRAINT_MODEL: "constraint-model",
      GEMINI_TRAIT_WEIGHT_MODEL: "weight-model",
    },
  },
  fetch: async (_url, request) => {
    const body = JSON.parse(request.body);
    const systemText = body.systemInstruction.parts[0].text;
    const payload = systemText.includes("trait-importance weighting engine")
      ? currentGeminiPayload.weights
      : systemText.includes("recommendation constraints")
        ? currentGeminiPayload.constraints
        : currentGeminiPayload.translation;

    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(payload) }],
            },
          },
        ],
      }),
    };
  },
}).exports;

const filters = loadCommonJsModule(path.resolve("lib/filters.ts"), {
  require: (specifier) => {
    if (specifier === "./platforms") return platforms;
    throw new Error(`Unexpected module import in filters E2E test: ${specifier}`);
  },
}).exports;
const recommendationsRoute = loadCommonJsModule(path.resolve("app/api/recommendations/route.ts"), {
  require: (specifier) => {
    if (specifier === "next/server") {
      return {
        NextResponse: {
          json: (body, init = {}) => ({
            status: init.status ?? 200,
            async json() {
              return body;
            },
          }),
        },
      };
    }

    if (specifier === "@/lib/supabase/server") {
      return {
        getSupabaseServerClient: () => currentSupabase,
      };
    }

    if (specifier === "@/lib/platforms") {
      return platforms;
    }

    throw new Error(`Unexpected module import in filtering E2E test: ${specifier}`);
  },
}).exports;

async function runFilteringScenario({ prompt, savedServices, gemini, traitRows, metadataRows, limit = 10 }) {
  currentGeminiPayload = {
    translation: {
      rationale: "Mocked prompt translation.",
      vector: defaultVector,
      ...gemini.translation,
    },
    constraints: {
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
      ...gemini.constraints,
    },
    weights: {
      rationale: "Mocked trait weighting.",
      weights: defaultWeights,
      ...gemini.weights,
    },
  };
  currentSupabase = createSupabaseMock({ traitRows, metadataRows });

  const analysis = await translator.analyzePrompt(prompt);
  const menuFilters = { platforms: savedServices };
  const resolved = filters.resolvePromptAndMenuConstraints(analysis.constraints, menuFilters);
  const dbFilters = filters.resolveTimeFrameFilters(resolved.filters);

  const response = await recommendationsRoute.POST(
    new Request("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        traitVector: analysis.vector,
        traitWeights: analysis.traitWeights.weights,
        promptConstraints: analysis.constraints,
        menuFilters,
        filters: dbFilters,
        limit,
      }),
    }),
  );

  const payload = await response.json();
  assert.equal(response.status, 200);

  return {
    analysis,
    resolvedFilters: dbFilters,
    payload,
    recommendationIds: payload.recommendations.map((recommendation) => recommendation.id),
  };
}

const catalogTraitRows = [
  traitRow("movie_netflix_95", "movie", "Netflix Movie", defaultVector, {
    duration_minutes: 95,
    platform_keys: ["netflix"],
  }),
  traitRow("movie_apple_95", "movie", "Apple Movie", defaultVector, {
    duration_minutes: 95,
    platform_keys: ["apple_tv_plus"],
  }),
  traitRow("movie_netflix_145", "movie", "Long Netflix Movie", defaultVector, {
    duration_minutes: 145,
    platform_keys: ["netflix"],
  }),
  traitRow("show_netflix_45", "tv", "Netflix Show", defaultVector, {
    duration_minutes: 45,
    platform_keys: ["netflix"],
  }),
  traitRow("show_disney_35", "tv", "Disney Show", defaultVector, {
    duration_minutes: 35,
    platform_keys: ["disney_plus"],
  }),
  traitRow("podcast_spotify_42", "podcast", "Spotify Podcast", defaultVector, {
    duration_minutes: 42,
    platform_keys: ["spotify"],
  }),
  traitRow("book_kindle", "book", "Kindle Book", defaultVector, {
    platform_keys: ["amazon_books", "kindle_unlimited", "audible"],
  }),
];

const catalogMetadataRows = [
  metadataRow("movie_netflix_95", {
    movie_title: "Netflix Movie",
    director: "N. Director",
    runtime: "95",
    israel_subscription_platforms: "[\"Netflix Israel\"]",
    netflix_url: "https://netflix.example/movie",
  }),
  metadataRow("movie_apple_95", {
    movie_title: "Apple Movie",
    director: "A. Director",
    runtime: "95",
    israel_subscription_platforms: "[\"Apple TV+\"]",
    apple_tv_url: "https://tv.apple.example/movie",
  }),
  metadataRow("movie_netflix_145", {
    movie_title: "Long Netflix Movie",
    director: "L. Director",
    runtime: "145",
    israel_subscription_platforms: "[\"Netflix Israel\"]",
    netflix_url: "https://netflix.example/long-movie",
  }),
  metadataRow("show_netflix_45", {
    show_title: "Netflix Show",
    runtime: "45",
    number_of_seasons: "1",
    israel_streaming_platforms: "[\"Netflix Israel\"]",
    netflix_url: "https://netflix.example/show",
  }),
  metadataRow("show_disney_35", {
    show_title: "Disney Show",
    runtime: "35",
    number_of_seasons: "2",
    israel_streaming_platforms: "[\"Disney+ Israel\"]",
    disney_plus_url: "https://disney.example/show",
  }),
  metadataRow("podcast_spotify_42", {
    show_title: "Spotify Podcast",
    episode_title: "A Good Episode",
    host_or_key_guest: "Host",
    approximate_duration_minutes: 42,
    spotify_episode_url: "https://spotify.example/episode",
  }),
  metadataRow("book_kindle", {
    book_title: "Kindle Book",
    author: "K. Author",
    page_count: "320",
    israel_accessibility_channels: "['Amazon','Kindle Store','Audible']",
    kindle_url: "https://kindle.example/book",
    audible_url: "https://audible.example/book",
  }),
];

const shortNetflixMovie = await runFilteringScenario({
  prompt: "I want a Netflix movie under two hours",
  savedServices: ["Apple TV+"],
  gemini: {
    constraints: {
      mediaTypes: ["movie"],
      timeLimit: {
        mentioned: true,
        rawText: "under two hours",
        maxMinutes: 120,
      },
      platforms: ["Netflix"],
    },
  },
  traitRows: catalogTraitRows,
  metadataRows: catalogMetadataRows,
});
assert.deepEqual(plain(shortNetflixMovie.resolvedFilters.types), ["movie"]);
assert.deepEqual(plain(shortNetflixMovie.resolvedFilters.platforms), ["Netflix"]);
assert.equal(shortNetflixMovie.resolvedFilters.maxMinutes, 120);
assert.deepEqual(plain(shortNetflixMovie.recommendationIds), ["movie_netflix_95"]);
assert.deepEqual(plain(shortNetflixMovie.payload.recommendations[0].platforms), ["Netflix"]);
assert.equal(shortNetflixMovie.payload.diagnostics.hardFilteredItems, 1);

const savedServicesApplyWhenPromptIsSilent = await runFilteringScenario({
  prompt: "Give me a short comfort show",
  savedServices: ["Disney+"],
  gemini: {
    constraints: {
      mediaTypes: ["show"],
      timeLimit: {
        mentioned: true,
        rawText: "short",
        maxMinutes: 40,
      },
      platforms: [],
    },
  },
  traitRows: catalogTraitRows,
  metadataRows: catalogMetadataRows,
});
assert.deepEqual(plain(savedServicesApplyWhenPromptIsSilent.resolvedFilters.types), ["show"]);
assert.deepEqual(plain(savedServicesApplyWhenPromptIsSilent.resolvedFilters.platforms), ["Disney+"]);
assert.deepEqual(plain(savedServicesApplyWhenPromptIsSilent.recommendationIds), ["show_disney_35"]);
assert.deepEqual(plain(savedServicesApplyWhenPromptIsSilent.payload.recommendations[0].platforms), ["Disney+"]);

const promptPlatformOverridesSavedServices = await runFilteringScenario({
  prompt: "Find me a Netflix show",
  savedServices: ["Disney+"],
  gemini: {
    constraints: {
      mediaTypes: ["show"],
      platforms: ["Netflix"],
    },
  },
  traitRows: catalogTraitRows,
  metadataRows: catalogMetadataRows,
});
assert.deepEqual(plain(promptPlatformOverridesSavedServices.resolvedFilters.platforms), ["Netflix"]);
assert.deepEqual(plain(promptPlatformOverridesSavedServices.recommendationIds), ["show_netflix_45"]);

const savedListeningAndReadingPlatformsFilterNonVideoItems = await runFilteringScenario({
  prompt: "Something informative for my commute",
  savedServices: ["Spotify", "Kindle Unlimited"],
  gemini: {
    constraints: {
      mediaTypes: ["podcast", "book"],
      platforms: [],
    },
  },
  traitRows: catalogTraitRows,
  metadataRows: catalogMetadataRows,
});
assert.deepEqual(plain(savedListeningAndReadingPlatformsFilterNonVideoItems.resolvedFilters.platforms), ["Spotify", "Kindle Unlimited"]);
assert.deepEqual(plain(savedListeningAndReadingPlatformsFilterNonVideoItems.recommendationIds), ["podcast_spotify_42", "book_kindle"]);

const amazonMeansPrimeVideoForMovies = await runFilteringScenario({
  prompt: "An Amazon movie",
  savedServices: [],
  gemini: {
    constraints: {
      mediaTypes: ["movie"],
      platforms: ["Amazon"],
    },
  },
  traitRows: [
    traitRow("movie_prime", "movie", "Prime Movie", defaultVector, {
      duration_minutes: 95,
      platform_keys: ["amazon_prime_video"],
    }),
    traitRow("book_amazon", "book", "Amazon Book", defaultVector, {
      platform_keys: ["amazon_books"],
    }),
  ],
  metadataRows: [
    metadataRow("movie_prime", {
      movie_title: "Prime Movie",
      director: "P. Director",
      runtime: "95",
      israel_subscription_platforms: "[\"Prime Video\"]",
      amazon_url: "https://prime.example/movie",
    }),
    metadataRow("book_amazon", {
      book_title: "Amazon Book",
      author: "A. Author",
      page_count: "280",
      israel_accessibility_channels: "['Amazon']",
    }),
  ],
});
assert.deepEqual(plain(amazonMeansPrimeVideoForMovies.recommendationIds), ["movie_prime"]);

const amazonMeansBookStoreForBooks = await runFilteringScenario({
  prompt: "An Amazon book",
  savedServices: [],
  gemini: {
    constraints: {
      mediaTypes: ["book"],
      platforms: ["Amazon"],
    },
  },
  traitRows: [
    traitRow("movie_prime", "movie", "Prime Movie", defaultVector, {
      duration_minutes: 95,
      platform_keys: ["amazon_prime_video"],
    }),
    traitRow("book_amazon", "book", "Amazon Book", defaultVector, {
      platform_keys: ["amazon_books"],
    }),
  ],
  metadataRows: [
    metadataRow("movie_prime", {
      movie_title: "Prime Movie",
      director: "P. Director",
      runtime: "95",
      israel_subscription_platforms: "[\"Prime Video\"]",
      amazon_url: "https://prime.example/movie",
    }),
    metadataRow("book_amazon", {
      book_title: "Amazon Book",
      author: "A. Author",
      page_count: "280",
      israel_accessibility_channels: "['Amazon']",
    }),
  ],
});
assert.deepEqual(plain(amazonMeansBookStoreForBooks.recommendationIds), ["book_amazon"]);

const primeVideoDoesNotMatchAmazonBooks = await runFilteringScenario({
  prompt: "Something on Prime Video",
  savedServices: [],
  gemini: {
    constraints: {
      mediaTypes: [],
      platforms: ["Prime Video"],
    },
  },
  traitRows: [
    traitRow("movie_prime", "movie", "Prime Movie", defaultVector, {
      duration_minutes: 95,
      platform_keys: ["amazon_prime_video"],
    }),
    traitRow("book_amazon", "book", "Amazon Book", defaultVector, {
      platform_keys: ["amazon_books"],
    }),
  ],
  metadataRows: [
    metadataRow("movie_prime", {
      movie_title: "Prime Movie",
      director: "P. Director",
      runtime: "95",
      israel_subscription_platforms: "[\"Prime Video\"]",
      amazon_url: "https://prime.example/movie",
    }),
    metadataRow("book_amazon", {
      book_title: "Amazon Book",
      author: "A. Author",
      page_count: "280",
      israel_accessibility_channels: "['Amazon']",
    }),
  ],
});
assert.deepEqual(plain(primeVideoDoesNotMatchAmazonBooks.recommendationIds), ["movie_prime"]);

const weightedCosineRanksByImportantTraits = await runFilteringScenario({
  prompt: "A precise low-friction movie match",
  savedServices: [],
  gemini: {
    translation: {
      vector: [7, 1, 3, 4, 4, 2, 5, 3, 4, 3, 3, 2, 2, 2, 3],
    },
    weights: {
      weights: [6, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    constraints: {
      mediaTypes: ["movie"],
    },
  },
  traitRows: [
    traitRow("movie_weighted_winner", "movie", "Weighted Winner", [6, 1, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]),
    traitRow("movie_weighted_runner_up", "movie", "Weighted Runner Up", [7, 7, 3, 4, 4, 2, 5, 3, 4, 3, 3, 2, 2, 2, 3]),
  ],
  metadataRows: [
    metadataRow("movie_weighted_winner", {
      movie_title: "Weighted Winner",
      director: "W. Director",
      runtime: "100",
    }),
    metadataRow("movie_weighted_runner_up", {
      movie_title: "Weighted Runner Up",
      director: "R. Director",
      runtime: "100",
    }),
  ],
  limit: 2,
});
assert.deepEqual(plain(weightedCosineRanksByImportantTraits.recommendationIds), [
  "movie_weighted_winner",
  "movie_weighted_runner_up",
]);
assert.equal(weightedCosineRanksByImportantTraits.payload.diagnostics.candidateItems, 2);

console.log("Filtering E2E passed: prompts, saved services, final constraints, and DB item filtering stay aligned.");
