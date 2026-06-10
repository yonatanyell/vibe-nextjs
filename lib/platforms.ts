import type { MediaType } from "./store";

export type SourceType = "podcast" | "tv" | "movie" | "book";

export const PLATFORM_GROUPS = [
  { title: "TV & Movies", subtitle: "Where you stream", items: ["Netflix", "HBO Max", "Disney+", "Apple TV+", "Prime Video", "Hulu"] },
  { title: "Podcasts", subtitle: "How you listen", items: ["Spotify", "Apple Podcasts", "Pocket Casts", "YouTube"] },
  { title: "Books", subtitle: "Where you read", items: ["Kindle Unlimited", "Audible", "Apple Books", "Libby", "Evrit"] },
] as const;

const PLATFORM_LABELS: Record<string, string> = {
  netflix: "Netflix",
  hbo_max: "HBO Max",
  disney_plus: "Disney+",
  apple_tv_plus: "Apple TV+",
  amazon_prime_video: "Prime Video",
  hulu: "Hulu",
  spotify: "Spotify",
  apple_podcasts: "Apple Podcasts",
  pocket_casts: "Pocket Casts",
  youtube: "YouTube",
  kindle_unlimited: "Kindle Unlimited",
  audible: "Audible",
  apple_books: "Apple Books",
  libby: "Libby",
  evrit: "Evrit",
  amazon_books: "Amazon",
};

export function sourceTypeForMediaType(type: MediaType): SourceType {
  return type === "show" ? "tv" : type;
}

export function platformKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\+/g, " plus")
    .replace(/&/g, " and ")
    .replace(/\bisrael\b/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function platformKeysForLabel(value: string, sourceType: SourceType) {
  const text = value.toLowerCase().replace(/\bisrael\b/g, "").trim();

  if (sourceType === "podcast") {
    if (/\bapple podcasts?\b/.test(text)) return ["apple_podcasts"];
    if (/\bspotify\b/.test(text)) return ["spotify"];
    if (/\bpocket casts?\b/.test(text)) return ["pocket_casts"];
    if (/\byoutube\b/.test(text)) return ["youtube"];
  }

  if (sourceType === "book") {
    if (/\bkindle\b/.test(text)) return ["kindle_unlimited"];
    if (/\baudible\b/.test(text)) return ["audible"];
    if (/\bevrit\b/.test(text)) return ["evrit"];
    if (/\bapple books?\b/.test(text)) return ["apple_books"];
    if (/\blibby\b/.test(text)) return ["libby"];
    if (/\bamazon\b/.test(text)) return ["amazon_books"];
  }

  if (sourceType === "movie" || sourceType === "tv") {
    if (/\bnetflix\b/.test(text)) return ["netflix"];
    if (/\bapple tv\b/.test(text)) return ["apple_tv_plus"];
    if (/\bdisney\b/.test(text)) return ["disney_plus"];
    if (/\bhbo\b|\bmax\b/.test(text)) return ["hbo_max"];
    if (/\bprime video\b|\bamazon\b/.test(text)) return ["amazon_prime_video"];
    if (/\bhulu\b/.test(text)) return ["hulu"];
  }

  const fallback = platformKey(value);
  return fallback ? [fallback] : [];
}

export function platformKeysForFilters(platforms: string[], sourceTypes: SourceType[] | null) {
  const candidateSourceTypes = sourceTypes?.length ? sourceTypes : ["podcast", "tv", "movie", "book"] satisfies SourceType[];
  return Array.from(
    new Set(platforms.flatMap((platform) => candidateSourceTypes.flatMap((sourceType) => platformKeysForLabel(platform, sourceType)))),
  );
}

export function canonicalPlatformLabel(value: string, sourceType: SourceType) {
  const keys = platformKeysForLabel(value, sourceType);
  return keys.length ? PLATFORM_LABELS[keys[0]] ?? value.trim() : value.trim();
}

export function canonicalPlatformLabels(values: string[], sourceType: SourceType) {
  const labels = new Map<string, string>();
  values.forEach((value) => {
    const keys = platformKeysForLabel(value, sourceType);
    if (!keys.length) return;
    const label = PLATFORM_LABELS[keys[0]] ?? value.trim();
    if (label && !labels.has(keys[0])) labels.set(keys[0], label);
  });
  return Array.from(labels.values());
}

export function canonicalFilterPlatformLabels(values: string[]) {
  const labels = new Map<string, string>();
  values.forEach((value) => {
    const label = String(value ?? "").trim();
    const canonical = canonicalAnyPlatformLabel(label);
    const key = platformKey(canonical);
    if (!label || !key || labels.has(key)) return;
    labels.set(key, canonical);
  });
  return Array.from(labels.values());
}

function canonicalAnyPlatformLabel(value: string) {
  const text = value.toLowerCase().replace(/\bisrael\b/g, "").trim();
  if (/\bnetflix\b/.test(text)) return "Netflix";
  if (/\bapple tv\b/.test(text)) return "Apple TV+";
  if (/\bdisney\b/.test(text)) return "Disney+";
  if (/\bhbo\b|\bmax\b/.test(text)) return "HBO Max";
  if (/\bprime video\b/.test(text)) return "Prime Video";
  if (/\bhulu\b/.test(text)) return "Hulu";
  if (/\bapple podcasts?\b/.test(text)) return "Apple Podcasts";
  if (/\bspotify\b/.test(text)) return "Spotify";
  if (/\bpocket casts?\b/.test(text)) return "Pocket Casts";
  if (/\byoutube\b/.test(text)) return "YouTube";
  if (/\bkindle\b/.test(text)) return "Kindle Unlimited";
  if (/\baudible\b/.test(text)) return "Audible";
  if (/\bevrit\b/.test(text)) return "Evrit";
  if (/\bapple books?\b/.test(text)) return "Apple Books";
  if (/\blibby\b/.test(text)) return "Libby";
  if (/\bamazon\b/.test(text)) return "Amazon";
  return value.trim();
}

export function platformMatches(itemPlatform: string, selectedPlatforms: string[], mediaType: MediaType) {
  const sourceType = sourceTypeForMediaType(mediaType);
  const itemKeys = platformKeysForLabel(itemPlatform, sourceType);
  return selectedPlatforms.some((platform) =>
    platformKeysForLabel(platform, sourceType).some((key) => itemKeys.includes(key)),
  );
}
