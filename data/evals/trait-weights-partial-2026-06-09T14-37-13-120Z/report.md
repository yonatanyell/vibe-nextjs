# Partial Trait Weight Evaluation

Only 6 of 20 real app weight vectors were available before Gemini quota/rate limits blocked further app calls.

Average review score: 8.33 / 10

## 1. I want something funny and light that moves fast, ideally not too long.
Weights: [5, 7, 0, 3, 5, 4, 7, 1, 1, 3, 2, 0, 0, 0, 1]
Top weights: Hedonic Pleasure=7, Narrative Velocity=7, Cognitive Load=5, Comfort and Emotional Safety=5, Distress and Unease=4
Review: minor_issues (8/10)
Assessment: The vector captures the core request well: funny/light maps strongly to Hedonic Pleasure, fast maps strongly to Narrative Velocity, and light/not too long reasonably raises Cognitive Load and Comfort/Safety as importance constraints. The main issue is some mild over-weighting of traits not clearly requested, especially Relational Warmth and Parasocial/Hangout Appeal.
Issues: Relational Warmth at 3 is not well supported; the user asked for funny and light, not necessarily warm, cozy, or relationship-centered.; Parasocial / Hangout Appeal at 2 is weakly inferred at best; nothing in the prompt asks for hangout vibes or personality-driven comfort viewing.; Distress and Unease at 4 is directionally right because 'light' implies avoiding distress, though it could arguably be 5 alongside Comfort if the system treats 'light' as a strong low-distress constraint.; Affective Arousal at 3 is acceptable but slightly ambiguous: fast and funny may imply energy, but the user did not ask for intense excitement.
Suggested changes: Consider lowering Relational Warmth from 3 to 1 or 2.; Consider lowering Parasocial / Hangout Appeal from 2 to 0 or 1.; Optionally raise Distress and Unease from 4 to 5 if 'light' is interpreted as a strong exclusion of stressful or upsetting content.

## 2. Recommend a movie or show that is deep, morally complex, and gives me a lot to think about afterward.
Weights: [6, 1, 7, 2, 1, 3, 1, 4, 1, 1, 0, 7, 3, 2, 3]
Top weights: Eudaimonic Weight=7, Moral Complexity=7, Cognitive Load=6, Curiosity and Mystery=4
Review: minor_issues (8/10)
Assessment: The core emphasis is right: Eudaimonic Weight, Moral Complexity, and Cognitive Load should dominate for a request that is deep, morally complex, and thought-provoking. Most low weights are reasonable because the user is not asking for comfort, hangout appeal, sensory richness, or entertainment-first pleasure.
Issues: Curiosity and Mystery at 4 is defensible but slightly high; the prompt asks for reflection and complexity, not necessarily mystery or puzzle-box engagement.; Ontological Instability at 3 feels over-weighted. Moral depth can be realist, social, political, or psychological without unstable reality or metaphysics.; Identity and Social Resonance at 3 is plausible but not directly requested; the prompt does not specifically ask for social relevance, representation, or identity resonance.; Informational Utility at 2 may be a little high unless the app treats 'gives me a lot to think about' as partly educational; the prompt is more interpretive/philosophical than informational.
Suggested changes: Keep Cognitive Load around 5-6, Eudaimonic Weight at 7, and Moral Complexity at 7.; Consider Curiosity and Mystery around 3 instead of 4.; Consider Ontological Instability around 1-2 instead of 3.; Consider Identity and Social Resonance around 1-2 unless the recommender intentionally maps moral reflection to social resonance.

## 3. I need something cozy and comforting tonight, but definitely not scary or stressful.
Weights: [1, 5, 0, 5, 7, 7, 1, 1, 2, 4, 3, 0, 0, 0, 0]
Top weights: Comfort and Emotional Safety=7, Distress and Unease=7, Hedonic Pleasure=5, Affective Arousal=5, Relational Warmth=4
Review: pass (8/10)
Assessment: The vector correctly identifies Comfort and Emotional Safety and Distress and Unease as dominant because the user explicitly wants comfort and explicitly rejects scary or stressful content. Hedonic Pleasure and Relational Warmth are also appropriately important for a cozy recommendation.
Issues: Affective Arousal at 5 is defensible as an importance weight because the app must avoid high-arousal stress/fear, but the rationale should make clear that the desired target is low arousal, not high arousal.; Parasocial / Hangout Appeal at 3 is plausible but slightly optional; the prompt asks for cozy/comforting, not necessarily hangout-style media.; Immersive Texture at 2 may be a little low if 'cozy' is interpreted as atmosphere-heavy, though this is not a major problem.
Suggested changes: Clarify that Affective Arousal is important for filtering toward low intensity.; Consider Parasocial / Hangout Appeal at 2 instead of 3 unless the recommender treats cozy comfort as strongly hangout-driven.; Optionally raise Immersive Texture to 3 if cozy atmosphere is a major matching dimension.

## 4. Find me something educational but still entertaining, like I learn things without feeling like I’m watching homework.
Weights: [5, 6, 2, 1, 2, 0, 2, 4, 1, 2, 3, 0, 0, 7, 1]
Top weights: Informational Utility=7, Hedonic Pleasure=6, Cognitive Load=5, Curiosity and Mystery=4
Review: pass (9/10)
Assessment: The vector correctly makes Informational Utility dominant and Hedonic Pleasure very high, with Cognitive Load also important because the user wants learning that feels accessible rather than like homework. The overall prioritization matches the prompt well.
Issues: Curiosity and Mystery at 4 is defensible for engaging educational content, but the prompt does not specifically ask for mystery or inquiry-driven material, so it may be slightly high.; Parasocial / Hangout Appeal at 3 is plausible for entertaining educational content, but it is inferred rather than directly requested.
Suggested changes: Consider lowering Curiosity and Mystery from 4 to 3 unless the app interprets 'learn things' as discovery-oriented content.; Consider lowering Parasocial / Hangout Appeal from 3 to 2 if host-driven comfort is not part of the recommendation strategy.

## 5. I’m looking for a really immersive world I can get lost in for a few evenings.
Weights: [2, 3, 1, 2, 2, 1, 4, 5, 7, 2, 4, 1, 1, 1, 1]
Top weights: Immersive Texture=7, Curiosity and Mystery=5, Narrative Velocity=4, Parasocial / Hangout Appeal=4
Review: minor_issues (8/10)
Assessment: The vector captures the central request well: Immersive Texture should be dominant for “immersive world” and “get lost in.” Curiosity/Mystery and Narrative Velocity are reasonable supporting traits for sustained multi-evening engagement, though the prompt does not explicitly ask for mystery or plot momentum.
Issues: Parasocial / Hangout Appeal at 4 is somewhat over-weighted; the user asks for a world, not specifically characters, companionship, or hangout vibes.; Curiosity and Mystery at 5 is plausible but slightly inferential; immersive worldbuilding can matter without a mystery/exploration hook.; Narrative Velocity at 4 is acceptable but could be a bit lower if the emphasis is atmosphere/world immersion rather than pace.
Suggested changes: Consider lowering Parasocial / Hangout Appeal from 4 to 2 or 3.; Consider Curiosity and Mystery at 4 instead of 5 unless the app interprets “get lost in” as exploration-driven engagement.; Keep Immersive Texture at 7.

## 6. Give me a mystery that actually keeps me guessing, but doesn’t get too confusing.
Weights: [6, 1, 0, 3, 1, 1, 2, 7, 1, 0, 0, 1, 1, 0, 0]
Top weights: Curiosity and Mystery=7, Cognitive Load=6
Review: pass (9/10)
Assessment: The vector correctly makes Curiosity and Mystery dominant and Cognitive Load highly important, which matches the core request: a mystery that sustains uncertainty without becoming hard to follow. Secondary Affective Arousal is reasonable for suspense/guessing, and most unrelated traits are appropriately near zero.
Issues: Narrative Velocity at 2 is acceptable but could arguably be 3, since pacing often affects whether a mystery keeps momentum and remains engaging.; Distress and Unease at 1 is fine; the prompt does not ask for 'not scary' or emotional safety, only clarity.
Suggested changes: Optionally raise Narrative Velocity from 2 to 3 if the system treats 'keeps me guessing' as partly dependent on pacing.

