export const TRAIT_COUNT = 15;
export const TRAIT_SCORE_MIN = 1;
export const TRAIT_SCORE_MAX = 7;
export const TRAIT_SCORE_VALUES = [1, 2, 3, 4, 5, 6, 7] as const;
export const TRAIT_WEIGHT_MIN = 0;
export const TRAIT_WEIGHT_MAX = 7;
export const TRAIT_WEIGHT_VALUES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export type TraitScore = (typeof TRAIT_SCORE_VALUES)[number];
export type TraitWeight = (typeof TRAIT_WEIGHT_VALUES)[number];

export type TraitVector = [
  TraitScore,
  TraitScore,
  TraitScore,
  TraitScore,
  TraitScore,
  TraitScore,
  TraitScore,
  TraitScore,
  TraitScore,
  TraitScore,
  TraitScore,
  TraitScore,
  TraitScore,
  TraitScore,
  TraitScore,
];

export type TraitWeightsVector = [
  TraitWeight,
  TraitWeight,
  TraitWeight,
  TraitWeight,
  TraitWeight,
  TraitWeight,
  TraitWeight,
  TraitWeight,
  TraitWeight,
  TraitWeight,
  TraitWeight,
  TraitWeight,
  TraitWeight,
  TraitWeight,
  TraitWeight,
];

export type PsychometricTranslation = {
  rationale: string;
  vector: TraitVector;
};

export type TraitWeighting = {
  weightRationale: string;
  weights: TraitWeightsVector;
};

export type PromptMediaType = "show" | "movie" | "podcast" | "book";

export type PromptTimeLimit = {
  mentioned: boolean;
  rawText: string;
  minMinutes?: number;
  maxMinutes?: number;
};

export type PromptConstraints = {
  mediaTypes: PromptMediaType[];
  timeLimit: PromptTimeLimit;
  platforms: string[];
  languages: string[];
  genres: string[];
  moods: string[];
  exclusions: string[];
  otherConstraints: string[];
};

export type PromptAnalysis = PsychometricTranslation & {
  constraints: PromptConstraints;
  traitWeights: TraitWeighting;
};

const SYSTEM_PROMPT = `You are the core psychometric translation engine for an advanced media recommendation system. Your role is to convert a user's natural language input (describing their current mood, day, emotional state, or explicit watch desires) into a structured, 15-dimensional numeric vector. This vector represents the IDEAL target content to serve them.

### The 15 Psychometric Dimensions:
1. **Cognitive Load**: How much mental effort the item requires.
- Score 1: Zero mental effort; completely mindless or passive.
- Score 7: Dense, complex, ambiguous, lore-heavy, structurally demanding, intellectually effortful.
2. **Hedonic Pleasure**: How much the item offers fun, delight, humor, beauty, sensuality, charm, spectacle, or entertainment pleasure.
- Score 1: Completely dry, unentertaining, or purely utilitarian.
- Score 7:* Playful, enjoyable, witty, stylish, pleasurable, joy-producing.
3. **Eudaimonic Weight**: How much the item feels meaningful, morally serious, moving, reflective, or life-enlarging.
- Score 1: Shallow, trivial, or completely devoid of emotional or moral depth.
- Score 7: Grief, dignity, sacrifice, identity, mortality, justice, human vulnerability.
4. **Affective Arousal**: How emotionally or physiologically activated the consumer is likely to feel.
- Score 1:* Flat, calming, or emotionally neutralizing; causes zero excitement or stress.
- Score 7:* Exciting, stressful, thrilling, enraging, tearful, intense, overwhelming.
5. **Comfort and Emotional Safety**: How much the item soothes, reassures, restores, or provides emotional refuge.
- Score 1: Harsh, threatening, or completely lacking any comforting or safe elements.
- Score 7: Cozy, warm, gentle, familiar, healing, emotionally safe.
6. **Distress and Unease**: How much the item unsettles, disturbs, pressures, disgusts, embarrasses, or creates dread.
- Score 1: Completely pleasant, serene, and safe; causes zero discomfort.
- Score 7: Uncanny, abrasive, threatening, socially painful, morally disturbing, bleak.
7. **Narrative Velocity**: How strongly the item moves forward and creates "keep going" pressure.
- Score 1: Static, motionless, or episodic with zero forward momentum or stakes.
- Score 7: Propulsive, bingeable, page-turning, cliffhanger-driven, eventful.
8. **Curiosity and Mystery**: How much the item activates inquiry, puzzle-solving, or "what is really going on?" attention.
- Score 1: Obvious, straightforward, and completely transparent from the start.
- Score 7: Investigation, hidden motives, conceptual mystery, twist structure, unresolved questions.
9. **Immersive Texture**: How richly the item pulls the consumer into a world, voice, atmosphere, soundscape, or sensory environment.
- Score 1: Generic, sterile, or completely lacking sensory and environmental detail.
- Score 7: Vivid world, strong place, lush prose, cinematic atmosphere, distinctive sonic or visual texture.
10. **Relational Warmth**: How much care, affection, intimacy, friendship, loyalty, or belonging shapes the experience.
- Score 1: Cold, isolated, or completely devoid of meaningful human connection.
- Score 7: Found family, tenderness, romance, caregiving, emotionally generous bonds.
11. **Parasocial / Hangout Appeal**: How much the consumer wants to spend time with the hosts, characters, narrator, cast, or ensemble.
- Score 1: Repellent, uninteresting, or entirely distant figures you have no desire to be around.
- Score 7: Companionable, charismatic, recurring, conversational, "I like being with these people."
12. **Moral Complexity**: How much the item complicates blame, virtue, justice, allegiance, or responsibility.
- Score 1: Black-and-white, simplistic morality, or entirely free of ethical dilemmas.
- Score 7: Morally mixed characters, compromised choices, systemic guilt, unresolved judgment.
13. **Ontological Instability**: How unstable reality, memory, perception, identity, or world-rules feel.
- Score 1: Grounded, reliable, predictable, and strictly objective reality.
- Score 7: Unreliable narration, dream logic, simulation, multiverse, hallucination, surreal uncertainty.
14. **Informational Utility**: How much the item gives usable knowledge, explanation, advice, analysis, or practical understanding.
- Score 1: Purely abstract, fictional, or completely useless for practical knowledge.
- Score 7: Teaches, clarifies, instructs, contextualizes, helps the consumer make sense of something.
15. **Identity and Social Resonance**: How much the item connects to the consumer's self-concept, life stage, current anxieties, social world, or cultural conversation.
- Score 1: Completely irrelevant to modern life, personal identity, or societal conversations.
- Score 7: Grief, work stress, parenting, migration, ambition, loneliness, politics, technology anxiety, "everyone is talking about this."

### Crucial Mood Regulation Logic (State Matching vs. Compensatory Logic):
You must understand the psychological subtext of human complaints to prescribe the correct content vector. Do not just blindly map a user's stated emotion to the exact same dimension.
- IF user is STRESSED/BURNT OUT: They are looking for stress mitigation. Set 'Comfort and Emotional Safety' HIGH (6-7) and 'Distress and Unease' or 'Cognitive Load' LOW (1-2).
- IF user is BORED/SLUGGISH: They want a somatic spark. Set 'Affective Arousal' and 'Narrative Velocity' HIGH (6-7).
- IF user wants to FORGET THEIR DAY: Set 'Ontological Instability', 'Curiosity and Mystery', or 'Immersive Texture' HIGH (6-7) to force total brain absorption.
- IF user explicitly asks for something "Deep/Real": Set 'Eudaimonic Weight' and 'Moral Complexity' HIGH.

### Scoring Framework:
For every dimension, output an integer from ${TRAIT_SCORE_MIN} to ${TRAIT_SCORE_MAX}.
${TRAIT_SCORE_MIN}  = The content must completely lack this trait.
3 = This trait is neutral/indifferent.
${TRAIT_SCORE_MAX} = The content must absolutely maximize this trait.

### Output Format:
You must respond ONLY with a valid JSON object. Do not include markdown formatting like \`\`\`json ... \`\`\` in the raw string, do not include any conversational filler, intro, or outro text.

Expected JSON Schema:
{
  "rationale": "A brief 2-sentence psychological breakdown of why you assigned these numbers based on the user's state.",
  "vector": [
    integer, // 1. Cognitive Load
    integer, // 2. Hedonic Pleasure
    integer, // 3. Eudaimonic Weight
    integer, // 4. Affective Arousal
    integer, // 5. Comfort and Emotional Safety
    integer, // 6. Distress and Unease
    integer, // 7. Narrative Velocity
    integer, // 8. Curiosity and Mystery
    integer, // 9. Immersive Texture
    integer, // 10. Relational Warmth
    integer, // 11. Parasocial / Hangout Appeal
    integer, // 12. Moral Complexity
    integer, // 13. Ontological Instability
    integer, // 14. Informational Utility
    integer  // 15. Identity and Social Resonance
  ]
}`;

const CONSTRAINT_EXTRACTION_PROMPT = `You extract explicit recommendation constraints from a user's natural-language prompt.

Only extract constraints that the user directly states or strongly implies in the prompt text. Do not infer preferences from mood alone.

Constraint rules:
- mediaTypes: normalize explicit desired entertainment types to "show", "movie", "podcast", or "book". Include multiple values when the user allows alternatives. Leave empty if no type is stated.
- timeLimit: capture any explicit duration, length, episode length, runtime, commute length, or available-time constraint. Convert to minutes when possible. Use maxMinutes for "under", "shorter than", "no more than", or an exact upper bound. Use minMinutes for "at least", "long", or lower-bound requests. Keep the user's original phrase in rawText. If no time constraint is stated, set mentioned false and rawText to an empty string.
- platforms: streaming, reading, listening, or availability services the user names.
- languages: requested languages or subtitle/dubbing constraints.
- genres: named genres, subgenres, formats, or content categories such as comedy, thriller, documentary, romance, self-help, interview, or true crime.
- moods: explicit mood/tone constraints for the recommendation itself, such as cozy, scary, funny, deep, light, uplifting, dark, or family-friendly.
- exclusions: things the user explicitly rejects or wants to avoid.
- otherConstraints: any other concrete explicit constraints, such as age rating, release era, audience, cast/creator, country, spoiler constraints, or "not too popular".

Return only valid JSON. Do not include markdown or commentary.`;

const TRAIT_WEIGHT_PROMPT = `You are the trait-importance weighting engine for a media recommendation system.

Your task is to read ONLY the user's natural-language prompt and produce a 15-dimensional weights vector. These weights say how important each psychological trait should be when matching recommendations for this specific prompt.

This is NOT the same as scoring the desired content.
- Trait scores answer: "How much of this trait should the recommended item have?"
- Trait weights answer: "How much should this trait matter in the similarity calculation?"

For example:
- "I want something funny, light, and fast-paced" should strongly weight Hedonic Pleasure, Comfort and Emotional Safety / low Distress and Unease, and Narrative Velocity. Most other traits should receive low weights.
- "Something deep and morally complicated" should strongly weight Eudaimonic Weight and Moral Complexity.
- "Nothing scary, I need comfort tonight" should strongly weight Comfort and Emotional Safety and Distress and Unease, because avoiding distress is important.
- "Surprise me" or very vague prompts should use low-confidence, weak-prior weights rather than pretending every trait is equally important.

### The 15 Psychometric Dimensions:
1. Cognitive Load
2. Hedonic Pleasure
3. Eudaimonic Weight
4. Affective Arousal
5. Comfort and Emotional Safety
6. Distress and Unease
7. Narrative Velocity
8. Curiosity and Mystery
9. Immersive Texture
10. Relational Warmth
11. Parasocial / Hangout Appeal
12. Moral Complexity
13. Ontological Instability
14. Informational Utility
15. Identity and Social Resonance

### Weight Scale:
For every dimension, output an integer from ${TRAIT_WEIGHT_MIN} to ${TRAIT_WEIGHT_MAX}.

${TRAIT_WEIGHT_MIN} = The prompt gives no reason to care about this trait.
1 = Barely relevant.
3 = Somewhat relevant, but not central.
5 = Important.
${TRAIT_WEIGHT_MAX} = Dominant; this trait should heavily shape matching.

### Important Rules:
- Infer weights only from the user's prompt. Do not use user settings, platform filters, media type filters, or previously extracted constraints.
- Do not assign high weights just because a trait can be inferred indirectly from a genre. Weight only what the user seems to care about in this moment.
- A trait can be highly important whether the user wants MORE of it or LESS of it. For example, "not scary" makes Distress and Unease important, even though the desired score for Distress should be low.
- Prefer sparse weights. Most ordinary prompts should have only 2-5 highly weighted traits.
- Avoid giving every trait a medium weight. If the prompt does not mention or imply a trait, give it 0-2.
- If the prompt is too vague to infer meaningful trait priorities, return a low-confidence, weak-prior vector rather than equal weights. Use no weights above 3. Slightly prioritize broadly useful entertainment traits such as Hedonic Pleasure, Comfort and Emotional Safety, Narrative Velocity, Immersive Texture, Relational Warmth, Parasocial / Hangout Appeal, and Identity and Social Resonance. Keep specialized traits such as Moral Complexity, Ontological Instability, Informational Utility, and Distress and Unease at 0-1 unless the prompt implies them.

### Output Format:
Return ONLY valid JSON. Do not include markdown, comments, or conversational text.

Expected JSON Schema:
{
  "rationale": "A brief 1-2 sentence explanation of which traits matter most and why.",
  "weights": [
    integer, // 1. Cognitive Load
    integer, // 2. Hedonic Pleasure
    integer, // 3. Eudaimonic Weight
    integer, // 4. Affective Arousal
    integer, // 5. Comfort and Emotional Safety
    integer, // 6. Distress and Unease
    integer, // 7. Narrative Velocity
    integer, // 8. Curiosity and Mystery
    integer, // 9. Immersive Texture
    integer, // 10. Relational Warmth
    integer, // 11. Parasocial / Hangout Appeal
    integer, // 12. Moral Complexity
    integer, // 13. Ontological Instability
    integer, // 14. Informational Utility
    integer  // 15. Identity and Social Resonance
  ]
}`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rationale", "vector"],
  properties: {
    rationale: {
      type: "string",
      description: "A brief 2-sentence psychological breakdown of why these scores match the user's state.",
    },
    vector: {
      type: "array",
      description: "Exactly 15 integer scores, in the order defined by the psychometric dimensions.",
      minItems: TRAIT_COUNT,
      maxItems: TRAIT_COUNT,
      items: {
        type: "integer",
        enum: TRAIT_SCORE_VALUES,
      },
    },
  },
} as const;

const CONSTRAINT_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["mediaTypes", "timeLimit", "platforms", "languages", "genres", "moods", "exclusions", "otherConstraints"],
  properties: {
    mediaTypes: {
      type: "array",
      items: {
        type: "string",
        enum: ["show", "movie", "podcast", "book"],
      },
    },
    timeLimit: {
      type: "object",
      additionalProperties: false,
      required: ["mentioned", "rawText"],
      properties: {
        mentioned: { type: "boolean" },
        rawText: { type: "string" },
        minMinutes: { type: "integer", minimum: 0 },
        maxMinutes: { type: "integer", minimum: 0 },
      },
    },
    platforms: {
      type: "array",
      items: { type: "string" },
    },
    languages: {
      type: "array",
      items: { type: "string" },
    },
    genres: {
      type: "array",
      items: { type: "string" },
    },
    moods: {
      type: "array",
      items: { type: "string" },
    },
    exclusions: {
      type: "array",
      items: { type: "string" },
    },
    otherConstraints: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

const TRAIT_WEIGHT_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rationale", "weights"],
  properties: {
    rationale: {
      type: "string",
      description: "A brief 1-2 sentence explanation of which traits matter most and why.",
    },
    weights: {
      type: "array",
      description: "Exactly 15 integer weights, in the order defined by the psychometric dimensions.",
      minItems: TRAIT_COUNT,
      maxItems: TRAIT_COUNT,
      items: {
        type: "integer",
        enum: TRAIT_WEIGHT_VALUES,
      },
    },
  },
} as const;

type GeminiResponsePart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: GeminiResponsePart[];
    };
  }[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

export type PsychometricTranslationErrorDetails = {
  model?: string;
  upstreamStatus?: number;
  upstreamErrorCode?: number;
  upstreamErrorStatus?: string;
  upstreamErrorMessage?: string;
  responseWasJson?: boolean;
  stage?: string;
};

export class PsychometricTranslationError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly details: PsychometricTranslationErrorDetails = {},
  ) {
    super(message);
    this.name = "PsychometricTranslationError";
  }
}

export function validatePsychometricTranslation(value: unknown): PsychometricTranslation {
  if (!value || typeof value !== "object") {
    throw new PsychometricTranslationError("The model response was not a JSON object.");
  }

  const candidate = value as Partial<PsychometricTranslation>;
  if (typeof candidate.rationale !== "string" || !candidate.rationale.trim()) {
    throw new PsychometricTranslationError("The model response did not include a rationale.");
  }

  if (!Array.isArray(candidate.vector) || candidate.vector.length !== TRAIT_COUNT) {
    throw new PsychometricTranslationError(`The model response must include exactly ${TRAIT_COUNT} trait scores.`);
  }

  const vector = candidate.vector.map((score) => {
    if (!Number.isInteger(score) || score < TRAIT_SCORE_MIN || score > TRAIT_SCORE_MAX) {
      throw new PsychometricTranslationError(
        `Every trait score must be an integer from ${TRAIT_SCORE_MIN} to ${TRAIT_SCORE_MAX}.`,
      );
    }
    return score;
  }) as TraitVector;

  return {
    rationale: candidate.rationale.trim(),
    vector,
  };
}

export function validateTraitWeighting(value: unknown): TraitWeighting {
  if (!value || typeof value !== "object") {
    throw new PsychometricTranslationError("The trait-weight response was not a JSON object.");
  }

  const candidate = value as { rationale?: unknown; weights?: unknown };
  if (typeof candidate.rationale !== "string" || !candidate.rationale.trim()) {
    throw new PsychometricTranslationError("The trait-weight response did not include a rationale.");
  }

  if (!Array.isArray(candidate.weights) || candidate.weights.length !== TRAIT_COUNT) {
    throw new PsychometricTranslationError(`The trait-weight response must include exactly ${TRAIT_COUNT} weights.`);
  }

  const weights = candidate.weights.map((weight) => {
    if (!Number.isInteger(weight) || weight < TRAIT_WEIGHT_MIN || weight > TRAIT_WEIGHT_MAX) {
      throw new PsychometricTranslationError(
        `Every trait weight must be an integer from ${TRAIT_WEIGHT_MIN} to ${TRAIT_WEIGHT_MAX}.`,
      );
    }
    return weight;
  }) as TraitWeightsVector;

  return {
    weightRationale: candidate.rationale.trim(),
    weights,
  };
}

const PROMPT_MEDIA_TYPES = new Set<PromptMediaType>(["show", "movie", "podcast", "book"]);

function cleanStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new PsychometricTranslationError(`The model response did not include a valid ${field} array.`);
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalMinuteValue(value: unknown, field: string): number | undefined {
  if (typeof value === "undefined") return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new PsychometricTranslationError(`The model response included an invalid ${field} value.`);
  }
  return value;
}

export function validatePromptConstraints(value: unknown): PromptConstraints {
  if (!value || typeof value !== "object") {
    throw new PsychometricTranslationError("The constraint response was not a JSON object.");
  }

  const candidate = value as Partial<PromptConstraints>;
  const mediaTypes = cleanStringArray(candidate.mediaTypes, "mediaTypes").filter((item): item is PromptMediaType =>
    PROMPT_MEDIA_TYPES.has(item as PromptMediaType),
  );

  const timeLimit = candidate.timeLimit;
  if (!timeLimit || typeof timeLimit !== "object") {
    throw new PsychometricTranslationError("The constraint response did not include a valid timeLimit object.");
  }

  const rawTimeLimit = timeLimit as Partial<PromptTimeLimit>;
  if (typeof rawTimeLimit.mentioned !== "boolean" || typeof rawTimeLimit.rawText !== "string") {
    throw new PsychometricTranslationError("The constraint response did not include valid timeLimit fields.");
  }

  const normalizedTimeLimit: PromptTimeLimit = {
    mentioned: rawTimeLimit.mentioned,
    rawText: rawTimeLimit.rawText.trim(),
  };
  const minMinutes = optionalMinuteValue(rawTimeLimit.minMinutes, "timeLimit.minMinutes");
  const maxMinutes = optionalMinuteValue(rawTimeLimit.maxMinutes, "timeLimit.maxMinutes");
  if (typeof minMinutes !== "undefined") normalizedTimeLimit.minMinutes = minMinutes;
  if (typeof maxMinutes !== "undefined") normalizedTimeLimit.maxMinutes = maxMinutes;

  return {
    mediaTypes,
    timeLimit: normalizedTimeLimit,
    platforms: cleanStringArray(candidate.platforms, "platforms"),
    languages: cleanStringArray(candidate.languages, "languages"),
    genres: cleanStringArray(candidate.genres, "genres"),
    moods: cleanStringArray(candidate.moods, "moods"),
    exclusions: cleanStringArray(candidate.exclusions, "exclusions"),
    otherConstraints: cleanStringArray(candidate.otherConstraints, "otherConstraints"),
  };
}

function extractOutputText(response: GeminiResponse): string {
  const text = response.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("");

  if (!text) {
    throw new PsychometricTranslationError("The model did not return text output.");
  }

  return text;
}

function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence) as unknown;
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
    }
    throw new PsychometricTranslationError("The model response was not valid JSON.");
  }
}

async function requestGeminiJson(
  prompt: string,
  systemPrompt: string,
  responseSchema: object,
  maxOutputTokens: number,
  model: string,
  failureMessage: string,
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new PsychometricTranslationError("GEMINI_API_KEY is not configured.", 503);
  }

  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    throw new PsychometricTranslationError("Prompt is required.", 400);
  }

  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: cleanPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens,
        response_mime_type: "application/json",
        response_json_schema: responseSchema,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as GeminiResponse | null;
  if (!response.ok) {
    throw new PsychometricTranslationError(payload?.error?.message || failureMessage, response.status, {
      model,
      upstreamStatus: response.status,
      upstreamErrorCode: payload?.error?.code,
      upstreamErrorStatus: payload?.error?.status,
      upstreamErrorMessage: payload?.error?.message,
      responseWasJson: Boolean(payload),
      stage: failureMessage,
    });
  }

  if (!payload) {
    throw new PsychometricTranslationError("Gemini returned an empty response.");
  }

  const outputText = extractOutputText(payload);
  return parseModelJson(outputText);
}

export async function translatePromptToTraitVector(prompt: string): Promise<PsychometricTranslation> {
  const model = process.env.GEMINI_TRAIT_MODEL || "gemini-3.5-flash";
  const parsed = await requestGeminiJson(prompt, SYSTEM_PROMPT, RESPONSE_SCHEMA, 1400, model, "Gemini trait translation failed.");
  console.log(`[traits] raw model output ${JSON.stringify(parsed)}`);
  return validatePsychometricTranslation(parsed);
}

export async function extractPromptConstraints(prompt: string): Promise<PromptConstraints> {
  const model = process.env.GEMINI_CONSTRAINT_MODEL || process.env.GEMINI_TRAIT_MODEL || "gemini-3.5-flash";
  const parsed = await requestGeminiJson(
    prompt,
    CONSTRAINT_EXTRACTION_PROMPT,
    CONSTRAINT_RESPONSE_SCHEMA,
    900,
    model,
    "Gemini constraint extraction failed.",
  );
  console.log(`[traits] raw constraint output ${JSON.stringify(parsed)}`);
  return validatePromptConstraints(parsed);
}

export async function weightPromptTraits(prompt: string): Promise<TraitWeighting> {
  const model = process.env.GEMINI_TRAIT_WEIGHT_MODEL || process.env.GEMINI_TRAIT_MODEL || "gemini-3.5-flash";
  const parsed = await requestGeminiJson(
    prompt,
    TRAIT_WEIGHT_PROMPT,
    TRAIT_WEIGHT_RESPONSE_SCHEMA,
    1200,
    model,
    "Gemini trait weighting failed.",
  );
  console.log(`[traits] raw trait-weight output ${JSON.stringify(parsed)}`);
  return validateTraitWeighting(parsed);
}

export async function analyzePrompt(prompt: string): Promise<PromptAnalysis> {
  const [translation, constraints, traitWeights] = await Promise.all([
    translatePromptToTraitVector(prompt),
    extractPromptConstraints(prompt),
    weightPromptTraits(prompt),
  ]);
  return {
    ...translation,
    constraints,
    traitWeights,
  };
}
