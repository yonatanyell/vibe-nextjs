import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const appDir = process.cwd();
const rootDir = path.resolve(appDir, "..");
const envPath = path.join(appDir, ".env");

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")];
    }),
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  return records
    .filter((record) => record.some((value) => value.trim()))
    .map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])));
}

function blankToNull(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

function optionalInt(value) {
  const trimmed = blankToNull(value);
  if (trimmed === null) return null;
  const match = trimmed.match(/\d+/);
  const parsed = match ? Number.parseInt(match[0], 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredScore(value, itemId, column) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 7) {
    throw new Error(`${itemId} has invalid ${column}: ${value}`);
  }
  return parsed;
}

function splitList(value) {
  if (!value) return [];
  const trimmed = String(value).trim();

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed.replace(/'/g, '"'));
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {}
  }

  return trimmed
    .split(/;|,|\||\//)
    .map((part) => part.trim().replace(/^["'\[]+|["'\]]+$/g, ""))
    .filter(Boolean);
}

function platformKey(value) {
  return value
    .toLowerCase()
    .replace(/\+/g, " plus")
    .replace(/&/g, " and ")
    .replace(/\bisrael\b/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function platformKeysForLabel(value, sourceType) {
  const text = String(value ?? "").toLowerCase().replace(/\bisrael\b/g, "").trim();

  if (sourceType === "podcast") {
    if (/\bapple podcasts?\b/.test(text)) return ["apple_podcasts"];
    if (/\bspotify\b/.test(text)) return ["spotify"];
  }

  if (sourceType === "book") {
    if (/\bkindle\b/.test(text)) return ["kindle_unlimited"];
    if (/\baudible\b/.test(text)) return ["audible"];
    if (/\bevrit\b/.test(text)) return ["evrit"];
    if (/\bamazon\b/.test(text)) return ["amazon_books"];
  }

  if (sourceType === "movie" || sourceType === "tv") {
    if (/\bnetflix\b/.test(text)) return ["netflix"];
    if (/\bapple tv\b/.test(text)) return ["apple_tv_plus"];
    if (/\bdisney\b/.test(text)) return ["disney_plus"];
    if (/\bhbo\b|\bmax\b/.test(text)) return ["hbo_max"];
    if (/\bprime video\b|\bamazon\b/.test(text)) return ["amazon_prime_video"];
  }

  const fallback = platformKey(value);
  return fallback ? [fallback] : [];
}

function uniquePlatformKeys(values, sourceType) {
  return Array.from(new Set(values.flatMap((value) => platformKeysForLabel(value, sourceType)).filter(Boolean)));
}

function platformKeysForMetadata(meta, sourceType) {
  const labels = [];

  if (sourceType === "podcast") {
    if (meta.apple_podcasts_episode_url) labels.push("Apple Podcasts");
    if (meta.spotify_episode_url) labels.push("Spotify");
  } else if (sourceType === "book") {
    labels.push(...splitList(meta.israel_accessibility_channels));
    if (meta.evrit_url) labels.push("Evrit");
    if (meta.kindle_url) labels.push("Kindle Unlimited");
    if (meta.audible_url) labels.push("Audible");
  } else {
    labels.push(...splitList(meta.israel_streaming_platforms || meta.israel_subscription_platforms));
    if (meta.netflix_url) labels.push("Netflix");
    if (meta.amazon_url) labels.push("Amazon");
    if (meta.disney_plus_url) labels.push("Disney+");
    if (meta.apple_tv_url) labels.push("Apple TV+");
    if (meta.hbo_max_url) labels.push("HBO Max");
  }

  return uniquePlatformKeys(labels, sourceType);
}

function durationMinutesForMetadata(meta, sourceType, fallbackDuration) {
  if (sourceType === "podcast") return meta.approximate_duration_minutes ?? optionalInt(fallbackDuration);
  if (sourceType === "movie") return optionalInt(meta.runtime) ?? optionalInt(fallbackDuration);
  if (sourceType === "tv") return optionalInt(fallbackDuration) ?? optionalInt(meta.runtime);
  return null;
}

async function upsertInBatches(table, rows) {
  const batchSize = 200;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "item_id" });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
    console.log(`${table}: imported ${Math.min(index + batch.length, rows.length)}/${rows.length}`);
  }
}

const allItemsRows = parseCsv(
  fs.readFileSync(path.join(rootDir, "First MVP/New 30/all_items_with_item_ids.csv"), "utf8"),
).map((row) => ({
  item_id: row.item_id,
  source_file: blankToNull(row.source_file),
  source_row: optionalInt(row.source_row),
  show_title: blankToNull(row.show_title),
  episode_title: blankToNull(row.episode_title),
  host_or_key_guest: blankToNull(row.host_or_key_guest),
  approximate_duration_minutes: optionalInt(row.approximate_duration_minutes),
  primary_category: blankToNull(row.primary_category),
  episode_hook_theme: blankToNull(row.episode_hook_theme),
  popularity_rationale: blankToNull(row.popularity_rationale),
  source_signals: blankToNull(row.source_signals),
  seed_category: blankToNull(row.seed_category),
  justification: blankToNull(row.justification),
  official_artwork_url: blankToNull(row.official_artwork_url),
  apple_podcasts_episode_url: blankToNull(row.apple_podcasts_episode_url),
  spotify_episode_url: blankToNull(row.spotify_episode_url),
  imdb_rating: blankToNull(row.IMDB_rating),
  rotten_tomatoes_rating: blankToNull(row.Rotten_Tomatoes_rating),
  year: blankToNull(row.year),
  runtime: blankToNull(row.Runtime),
  number_of_seasons: blankToNull(row.Number_of_seasons),
  leading_actors: blankToNull(row.leading_actors),
  israel_streaming_platforms: blankToNull(row.israel_streaming_platforms),
  format_type: blankToNull(row.format_type),
  primary_genre: blankToNull(row.primary_genre),
  pacing_velocity: blankToNull(row.pacing_velocity),
  narrative_hook_summary: blankToNull(row.narrative_hook_summary),
  cultural_signals: blankToNull(row.cultural_signals),
  psychological_justification: blankToNull(row.psychological_justification),
  netflix_url: blankToNull(row.netflix_url),
  amazon_url: blankToNull(row.amazon_url),
  disney_plus_url: blankToNull(row.disney_plus_url),
  apple_tv_url: blankToNull(row.apple_tv_url),
  hbo_max_url: blankToNull(row.hbo_max_url),
  movie_title: blankToNull(row.movie_title),
  director: blankToNull(row.Director),
  movie_leading_actors: blankToNull(row["Leading actors"]),
  release_year: blankToNull(row.release_year),
  israel_subscription_platforms: blankToNull(row.israel_subscription_platforms),
  language: blankToNull(row.language),
  official_trailer_url: blankToNull(row.official_trailer_url),
  book_title: blankToNull(row.book_title),
  author: blankToNull(row.author),
  publication_year: blankToNull(row.publication_year),
  israel_accessibility_channels: blankToNull(row.israel_accessibility_channels),
  original_language: blankToNull(row.original_language),
  goodreads_rating: blankToNull(row.goodreads_rating),
  amazon_rating: blankToNull(row.Amazon_rating),
  storygraph_rating: blankToNull(row.storygraph_rating),
  page_count: blankToNull(row.page_count),
  evrit_url: blankToNull(row.evrit_url),
  evrit_hebrew_title: blankToNull(row.evrit_hebrew_title),
  kindle_url: blankToNull(row.kindle_url),
  audible_url: blankToNull(row.audible_url),
}));
const metadataByItemId = new Map(allItemsRows.map((row) => [row.item_id, row]));

const scoreColumns = [
  ["Cognitive Load", "cognitive_load"],
  ["Hedonic Pleasure", "hedonic_pleasure"],
  ["Eudaimonic Weight", "eudaimonic_weight"],
  ["Affective Arousal", "affective_arousal"],
  ["Comfort and Emotional Safety", "comfort_and_emotional_safety"],
  ["Distress and Unease", "distress_and_unease"],
  ["Narrative Velocity", "narrative_velocity"],
  ["Curiosity and Mystery", "curiosity_and_mystery"],
  ["Immersive Texture", "immersive_texture"],
  ["Relational Warmth", "relational_warmth"],
  ["Parasocial / Hangout Appeal", "parasocial_hangout_appeal"],
  ["Moral Complexity", "moral_complexity"],
  ["Ontological Instability", "ontological_instability"],
  ["Informational Utility", "informational_utility"],
  ["Identity and Social Resonance", "identity_and_social_resonance"],
];

const traitScoreRows = parseCsv(
  fs.readFileSync(path.join(rootDir, "First MVP/New 30/mvp_1200_trait_scores.csv"), "utf8"),
).map((row) => {
  const scores = scoreColumns.map(([source]) => requiredScore(row[source], row.item_id, source));
  const meta = metadataByItemId.get(row.item_id);
  const duration = blankToNull(row.Duration);
  const mapped = {
    item_id: row.item_id,
    source_type: row.source_type,
    title: row.title,
    duration,
    duration_minutes: meta ? durationMinutesForMetadata(meta, row.source_type, duration) : optionalInt(duration),
    platform_keys: meta ? platformKeysForMetadata(meta, row.source_type) : [],
    psychological_justification: blankToNull(row.psychological_justification),
    trait_vector: scores,
  };

  scoreColumns.forEach(([, target], index) => {
    mapped[target] = scores[index];
  });

  return mapped;
});

await upsertInBatches("all_items_metadata", allItemsRows);
await upsertInBatches("all_items_traits_scores", traitScoreRows);

for (const table of ["all_items_metadata", "all_items_traits_scores"]) {
  const { count, error } = await supabase.from(table).select("item_id", { count: "exact", head: true });
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  console.log(`${table}: ${count} rows in Supabase`);
}

console.log("MVP CSV import complete.");
