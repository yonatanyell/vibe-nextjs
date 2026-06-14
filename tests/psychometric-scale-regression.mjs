import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const translatorPath = path.resolve("lib/psychometricTranslator.ts");
const source = fs.readFileSync(translatorPath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const sandbox = {
  exports: {},
  module: { exports: {} },
  process: { env: {} },
  console: { ...console, log: () => {} },
  URL,
  fetch,
};
sandbox.exports = sandbox.module.exports;

vm.runInNewContext(compiled, sandbox, { filename: translatorPath });

const {
  TRAIT_COUNT,
  TRAIT_SCORE_MIN,
  TRAIT_SCORE_MAX,
  TRAIT_SCORE_VALUES,
  TRAIT_WEIGHT_MIN,
  TRAIT_WEIGHT_MAX,
  TRAIT_WEIGHT_VALUES,
  analyzePrompt,
  extractPromptConstraints,
  translatePromptToTraitVector,
  weightPromptTraits,
  validatePsychometricTranslation,
  validatePromptConstraints,
  validateTraitWeighting,
  PsychometricTranslationError,
} = sandbox.module.exports;

assert.equal(TRAIT_COUNT, 15);
assert.deepEqual(Array.from(TRAIT_SCORE_VALUES), [1, 2, 3, 4, 5, 6, 7]);
assert.equal(TRAIT_WEIGHT_MIN, 0);
assert.equal(TRAIT_WEIGHT_MAX, 5);
assert.deepEqual(Array.from(TRAIT_WEIGHT_VALUES), [0, 1, 2, 3, 4, 5]);

const validVector = Array.from({ length: TRAIT_COUNT }, () => TRAIT_SCORE_MAX);
const validatedVector = validatePsychometricTranslation({
  rationale: "A valid vector should pass.",
  vector: validVector,
}).vector;
assert.deepEqual(Array.from(validatedVector), validVector);

const validWeights = Array.from({ length: TRAIT_COUNT }, (_, index) => (index % 2 === 0 ? TRAIT_WEIGHT_MAX : TRAIT_WEIGHT_MIN));
const validatedWeights = validateTraitWeighting({
  rationale: "A valid weight vector should pass.",
  weights: validWeights,
}).weights;
assert.deepEqual(Array.from(validatedWeights), validWeights);

for (const outOfRangeScore of [8, 9, 10]) {
  const vector = Array.from({ length: TRAIT_COUNT }, () => TRAIT_SCORE_MIN);
  vector[0] = outOfRangeScore;

  assert.throws(
    () =>
      validatePsychometricTranslation({
        rationale: "Out-of-range scores should fail.",
        vector,
      }),
    (error) =>
      error instanceof PsychometricTranslationError &&
      error.message === `Every trait score must be an integer from ${TRAIT_SCORE_MIN} to ${TRAIT_SCORE_MAX}.`,
    `Expected score ${outOfRangeScore} to be rejected.`,
  );
}

for (const outOfRangeWeight of [-1, 6, 7]) {
  const weights = Array.from({ length: TRAIT_COUNT }, () => TRAIT_WEIGHT_MIN);
  weights[0] = outOfRangeWeight;

  assert.throws(
    () =>
      validateTraitWeighting({
        rationale: "Out-of-range weights should fail.",
        weights,
      }),
    (error) =>
      error instanceof PsychometricTranslationError &&
      error.message === `Every trait weight must be an integer from ${TRAIT_WEIGHT_MIN} to ${TRAIT_WEIGHT_MAX}.`,
    `Expected weight ${outOfRangeWeight} to be rejected.`,
  );
}

const validatedConstraints = validatePromptConstraints({
  mediaTypes: ["movie", "podcast", "album"],
  timeLimit: {
    mentioned: true,
    rawText: "under 90 minutes",
    maxMinutes: 90,
  },
  platforms: ["Netflix", "  "],
  languages: ["English"],
  genres: ["thriller"],
  moods: ["tense"],
  exclusions: ["no gore"],
  otherConstraints: ["released after 2020"],
});

assert.deepEqual(validatedConstraints.mediaTypes, ["movie", "podcast"]);
assert.deepEqual(validatedConstraints.platforms, ["Netflix"]);
assert.deepEqual(JSON.parse(JSON.stringify(validatedConstraints.timeLimit)), {
  mentioned: true,
  rawText: "under 90 minutes",
  maxMinutes: 90,
});

const unconstrainedPrompt = validatePromptConstraints({
  mediaTypes: [],
  timeLimit: {
    mentioned: false,
    rawText: "  ",
  },
  platforms: [],
  languages: [],
  genres: [],
  moods: [],
  exclusions: [],
  otherConstraints: [],
});

assert.deepEqual(Array.from(unconstrainedPrompt.mediaTypes), []);
assert.deepEqual(JSON.parse(JSON.stringify(unconstrainedPrompt.timeLimit)), {
  mentioned: false,
  rawText: "",
});

assert.throws(
  () =>
    validatePromptConstraints({
      mediaTypes: [],
      timeLimit: {
        mentioned: true,
        rawText: "under an hour",
        maxMinutes: -60,
      },
      platforms: [],
      languages: [],
      genres: [],
      moods: [],
      exclusions: [],
      otherConstraints: [],
    }),
  (error) =>
    error instanceof PsychometricTranslationError &&
    error.message === "The model response included an invalid timeLimit.maxMinutes value.",
  "Expected negative time limits to be rejected.",
);

assert.throws(
  () =>
    validatePromptConstraints({
      mediaTypes: [],
      timeLimit: {
        mentioned: true,
        rawText: "under an hour",
        maxMinutes: null,
      },
      platforms: [],
      languages: [],
      genres: [],
      moods: [],
      exclusions: [],
      otherConstraints: [],
    }),
  (error) =>
    error instanceof PsychometricTranslationError &&
    error.message === "The model response included an invalid timeLimit.maxMinutes value.",
  "Expected null time limits to be rejected.",
);

assert.throws(
  () =>
    validatePromptConstraints({
      mediaTypes: [],
      timeLimit: {
        mentioned: false,
        rawText: "",
      },
      platforms: "Netflix",
      languages: [],
      genres: [],
      moods: [],
      exclusions: [],
      otherConstraints: [],
    }),
  (error) =>
    error instanceof PsychometricTranslationError &&
    error.message === "The model response did not include a valid platforms array.",
  "Expected malformed constraint arrays to be rejected.",
);

assert.throws(
  () =>
    validatePsychometricTranslation({
      rationale: "",
      vector: validVector,
    }),
  (error) => error instanceof PsychometricTranslationError && error.message === "The model response did not include a rationale.",
  "Expected empty rationales to be rejected.",
);

assert.throws(
  () =>
    validatePsychometricTranslation({
      rationale: "Too short.",
      vector: validVector.slice(0, 14),
    }),
  (error) => error instanceof PsychometricTranslationError && error.message === `The model response must include exactly ${TRAIT_COUNT} trait scores.`,
  "Expected short vectors to be rejected.",
);

assert.throws(
  () =>
    validateTraitWeighting({
      rationale: "Too short.",
      weights: validWeights.slice(0, 14),
    }),
  (error) => error instanceof PsychometricTranslationError && error.message === `The trait-weight response must include exactly ${TRAIT_COUNT} weights.`,
  "Expected short weight vectors to be rejected.",
);

await assert.rejects(
  () => translatePromptToTraitVector("I want a short movie"),
  (error) => error instanceof PsychometricTranslationError && error.status === 503 && error.message === "GEMINI_API_KEY is not configured.",
);

const validConstraintPayload = {
  mediaTypes: ["movie"],
  timeLimit: {
    mentioned: true,
    rawText: "short movie",
  },
  platforms: [],
  languages: [],
  genres: [],
  moods: ["light"],
  exclusions: ["no podcasts"],
  otherConstraints: [],
};
const validTranslationPayload = {
  rationale: "The prompt asks for light entertainment with low friction. A movie-length experience should fit the stated constraint.",
  vector: validVector,
};
const validWeightPayload = {
  rationale: "The prompt is mostly about length and lightness, so only a few traits should matter strongly.",
  weights: validWeights,
};
const fetchCalls = [];

sandbox.process.env.GEMINI_API_KEY = "test-key";
sandbox.process.env.GEMINI_TRAIT_MODEL = "trait-model";
sandbox.process.env.GEMINI_CONSTRAINT_MODEL = "constraint-model";
sandbox.process.env.GEMINI_TRAIT_WEIGHT_MODEL = "weight-model";
sandbox.fetch = async (url, request) => {
  const body = JSON.parse(request.body);
  fetchCalls.push({ url: String(url), body });
  const systemText = body.systemInstruction.parts[0].text;
  const payload = systemText.includes("trait-importance weighting engine")
    ? validWeightPayload
    : systemText.includes("recommendation constraints")
      ? validConstraintPayload
      : validTranslationPayload;
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
};

const translated = await translatePromptToTraitVector("I want a short movie");
assert.deepEqual(Array.from(translated.vector), validVector);

const extracted = await extractPromptConstraints("I want a short movie");
assert.deepEqual(Array.from(extracted.mediaTypes), ["movie"]);
assert.deepEqual(JSON.parse(JSON.stringify(extracted.timeLimit)), {
  mentioned: true,
  rawText: "short movie",
});

const weighted = await weightPromptTraits("I want a short movie");
assert.deepEqual(Array.from(weighted.weights), validWeights);
assert.equal(weighted.weightRationale, validWeightPayload.rationale);

const analyzed = await analyzePrompt("I want a short movie");
assert.deepEqual(Array.from(analyzed.vector), validVector);
assert.deepEqual(Array.from(analyzed.constraints.mediaTypes), ["movie"]);
assert.deepEqual(Array.from(analyzed.traitWeights.weights), validWeights);
assert.equal(fetchCalls.length, 6);
assert.match(fetchCalls[0].url, /models\/trait-model:generateContent/);
assert.match(fetchCalls[1].url, /models\/constraint-model:generateContent/);
assert.match(fetchCalls[2].url, /models\/weight-model:generateContent/);
assert.equal(fetchCalls[0].body.generationConfig.response_mime_type, "application/json");

console.log("Psychometric regression passed: trait scores, prompt constraints, and trait weights are validated.");
