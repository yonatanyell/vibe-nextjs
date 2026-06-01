export const TRAIT_COUNT = 15;

export type TraitVector = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type PsychometricTranslation = {
  rationale: string;
  vector: TraitVector;
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
For every dimension, output an integer from 1 to 10.
1  = The content must completely lack this trait.
3 = This trait is neutral/indifferent.
7 = The content must absolutely maximize this trait.

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

const SCORE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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
        enum: SCORE_VALUES,
      },
    },
  },
} as const;

type OpenAIResponseContent = {
  type?: string;
  text?: string;
};

type OpenAIResponseItem = {
  type?: string;
  content?: OpenAIResponseContent[];
};

type OpenAIResponse = {
  output_text?: string;
  output?: OpenAIResponseItem[];
  error?: {
    message?: string;
  };
};

export class PsychometricTranslationError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
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
    if (!Number.isInteger(score) || score < 1 || score > 10) {
      throw new PsychometricTranslationError("Every trait score must be an integer from 1 to 10.");
    }
    return score;
  }) as TraitVector;

  return {
    rationale: candidate.rationale.trim(),
    vector,
  };
}

function extractOutputText(response: OpenAIResponse): string {
  if (response.output_text) return response.output_text;

  const text = response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" || typeof content.text === "string")
    .map((content) => content.text ?? "")
    .join("");

  if (!text) {
    throw new PsychometricTranslationError("The model did not return text output.");
  }

  return text;
}

export async function translatePromptToTraitVector(prompt: string): Promise<PsychometricTranslation> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new PsychometricTranslationError("OPENAI_API_KEY is not configured.", 503);
  }

  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    throw new PsychometricTranslationError("Prompt is required.", 400);
  }

  const model = process.env.OPENAI_TRAIT_MODEL || "gpt-5.5";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: cleanPrompt },
      ],
      max_output_tokens: 700,
      text: {
        format: {
          type: "json_schema",
          name: "psychometric_trait_vector",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as OpenAIResponse | null;
  if (!response.ok) {
    throw new PsychometricTranslationError(payload?.error?.message || "OpenAI trait translation failed.", response.status);
  }

  if (!payload) {
    throw new PsychometricTranslationError("OpenAI returned an empty response.");
  }

  const parsed = JSON.parse(extractOutputText(payload)) as unknown;
  return validatePsychometricTranslation(parsed);
}
