import type { MediaType, Recommendation } from "./store";
import type { PromptConstraints } from "./psychometricTranslator";
import { canonicalFilterPlatformLabels, platformMatches } from "./platforms";

export type TimeFrame = "under-15" | "15-30" | "30-60" | "60-plus" | "60-120" | "120-plus";

export type RecommendationFilters = {
  types?: MediaType[];
  times?: TimeFrame[];
  platforms?: string[];
  minMinutes?: number;
  maxMinutes?: number;
  exactTimeConstraint?: boolean;
};

export type ConstraintResolution = {
  filters: RecommendationFilters;
  note?: string;
};

type MinuteRange = {
  minMinutes?: number;
  maxMinutes?: number;
};

export const MEDIA_TYPE_OPTIONS: { value: MediaType; label: string }[] = [
  { value: "show", label: "TV" },
  { value: "movie", label: "Movies" },
  { value: "book", label: "Books" },
  { value: "podcast", label: "Podcasts" },
];

export const TIME_FRAME_OPTIONS: { value: TimeFrame; label: string; queryText: string }[] = [
  { value: "under-15", label: "<15 min", queryText: "less than 15 minutes" },
  { value: "15-30", label: "15-30 min", queryText: "15 to 30 minutes" },
  { value: "30-60", label: "30-60 min", queryText: "30 to 60 minutes" },
  { value: "60-plus", label: "60+ min", queryText: "60 minutes or more" },
];

const MOVIE_TIME_FRAME_OPTIONS: { value: TimeFrame; label: string; queryText: string }[] = [
  { value: "60-120", label: "60-120 min", queryText: "60 to 120 minutes" },
  { value: "120-plus", label: "120+ min", queryText: "120 minutes or more" },
];

const ALL_TIME_FRAME_OPTIONS = [...TIME_FRAME_OPTIONS, ...MOVIE_TIME_FRAME_OPTIONS];

export const FILTER_PARAM_KEYS = {
  type: "type",
  time: "time",
} as const;

export function isMediaType(value: string | null): value is MediaType {
  return MEDIA_TYPE_OPTIONS.some((option) => option.value === value);
}

export function isTimeFrame(value: string | null): value is TimeFrame {
  return ALL_TIME_FRAME_OPTIONS.some((option) => option.value === value);
}

export function mediaTypeLabel(value?: MediaType | MediaType[]) {
  if (Array.isArray(value)) return compactSelectionLabel(value, MEDIA_TYPE_OPTIONS, "Any type", "types");
  return MEDIA_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "Any type";
}

export function timeFrameLabel(value?: TimeFrame | TimeFrame[]) {
  if (Array.isArray(value)) return compactSelectionLabel(value, ALL_TIME_FRAME_OPTIONS, "Any length", "lengths");
  return ALL_TIME_FRAME_OPTIONS.find((option) => option.value === value)?.label ?? "Any length";
}

export function describeFilters(filters: RecommendationFilters) {
  const parts = [];
  if (filters.types?.length) parts.push(expandedSelectionLabel(filters.types, MEDIA_TYPE_OPTIONS));
  if (filters.times?.length) parts.push(expandedSelectionLabel(filters.times, ALL_TIME_FRAME_OPTIONS));
  if (filters.platforms?.length) parts.push(compactStringLabel(filters.platforms, "platforms"));
  if (typeof filters.maxMinutes === "number") parts.push(`${filters.maxMinutes} min or less`);
  if (typeof filters.minMinutes === "number") parts.push(`${filters.minMinutes} min or more`);
  return parts.join(" - ");
}

export function promptWithFilters(prompt: string, filters: RecommendationFilters) {
  const constraints = [];
  if (filters.types?.length) constraints.push(expandedSelectionLabel(filters.types, MEDIA_TYPE_OPTIONS));
  if (filters.platforms?.length) constraints.push(`available on ${filters.platforms.join(" or ")}`);
  if (filters.times?.length) {
    const times = filters.times
      .map((time) => ALL_TIME_FRAME_OPTIONS.find((item) => item.value === time)?.queryText)
      .filter(Boolean);
    if (times.length) constraints.push(times.join(" or "));
  }
  return constraints.length ? `${prompt} (${constraints.join(", ")})` : prompt;
}

export function applyRecommendationFilters(recs: Recommendation[], filters: RecommendationFilters) {
  return recs.filter((rec) => {
    if (filters.types?.length && !filters.types.includes(rec.type)) return false;
    if (filters.platforms?.length && !rec.platforms.some((platform) => platformMatches(platform, filters.platforms ?? [], rec.type))) return false;
    if (rec.type === "book") return true;
    if (!matchesDurationFilter(rec.durationMinutes, filters)) return false;
    return true;
  });
}

export function resolveTimeFrameFilters(filters: RecommendationFilters): RecommendationFilters {
  if (!filters.times?.length) return filters;

  const ranges = filters.times.map((time) => expandMenuRange(timeFrameMinuteRange(time)));
  return {
    ...filters,
    minMinutes: maxDefined(filters.minMinutes, ...ranges.map((range) => range.minMinutes)),
    maxMinutes: minDefined(filters.maxMinutes, ...ranges.map((range) => range.maxMinutes)),
  };
}

export function resolvePromptAndMenuConstraints(
  promptConstraints: PromptConstraints | null | undefined,
  menuFilters: RecommendationFilters,
): ConstraintResolution {
  if (!promptConstraints) return { filters: menuFilters };

  const promptTypes = uniqueMediaTypes(promptConstraints.mediaTypes);
  const excludedTypes = mediaTypesFromExclusions(promptConstraints.exclusions);
  const menuTypes = uniqueMediaTypes(menuFilters.types ?? []);
  const activePromptTypes = promptTypes.filter((type) => !excludedTypes.includes(type));

  const filters: RecommendationFilters = {
    ...menuFilters,
    types: menuTypes.length ? menuTypes : undefined,
    times: menuFilters.times?.length ? menuFilters.times : undefined,
    platforms: uniqueStrings(menuFilters.platforms ?? []),
  };
  const notes: string[] = [];
  const promptPlatforms = uniqueStrings(promptConstraints.platforms);
  const settingsPlatforms = uniqueStrings(menuFilters.platforms ?? []);

  if (promptPlatforms.length) {
    filters.platforms = promptPlatforms;
  } else if (!settingsPlatforms.length) {
    filters.platforms = undefined;
  }

  if (promptConstraints.timeLimit.mentioned) {
    const movieTimeFrame = resolveVagueMovieTimeFrame(promptConstraints, activePromptTypes, menuTypes);
    if (movieTimeFrame) {
      filters.times = [movieTimeFrame];
      filters.minMinutes = undefined;
      filters.maxMinutes = undefined;
      filters.exactTimeConstraint = false;
    } else {
      filters.minMinutes = promptConstraints.timeLimit.minMinutes;
      filters.maxMinutes = promptConstraints.timeLimit.maxMinutes;
      filters.exactTimeConstraint =
        typeof promptConstraints.timeLimit.minMinutes === "number" || typeof promptConstraints.timeLimit.maxMinutes === "number";
    }

    if (menuFilters.times?.length && movieTimeFrame && !menuFilters.times.includes(movieTimeFrame)) {
      notes.push(`the prompt asked for ${promptConstraints.timeLimit.rawText || "a movie length"}, so I used ${expandedSelectionLabel([movieTimeFrame], ALL_TIME_FRAME_OPTIONS)} instead of ${expandedSelectionLabel(menuFilters.times, ALL_TIME_FRAME_OPTIONS)}`);
    } else if (menuFilters.times?.length && !movieTimeFrame && !timeFramesOverlapPromptLimit(menuFilters.times, promptConstraints.timeLimit)) {
      filters.times = undefined;
      notes.push(`the prompt asked for ${promptConstraints.timeLimit.rawText || "a specific length"}, so I used that instead of ${expandedSelectionLabel(menuFilters.times, ALL_TIME_FRAME_OPTIONS)}`);
    }
  }

  if (activePromptTypes.length && menuTypes.length) {
    const intersection = menuTypes.filter((type) => activePromptTypes.includes(type));
    if (intersection.length) {
      filters.types = intersection;
      if (intersection.length < activePromptTypes.length || intersection.length < menuTypes.length) {
        notes.push(
          `the prompt and menus differed on type, so I used ${expandedSelectionLabel(intersection, MEDIA_TYPE_OPTIONS)}`,
        );
      }
    } else {
      filters.types = activePromptTypes;
      notes.push(
        `the prompt and menus contradicted each other on type, so I used ${expandedSelectionLabel(activePromptTypes, MEDIA_TYPE_OPTIONS)}`,
      );
    }
  } else if (activePromptTypes.length) {
    filters.types = activePromptTypes;
  }

  if (excludedTypes.length) {
    const beforeExclusion = filters.types ?? menuTypes;
    const afterExclusion = beforeExclusion.filter((type) => !excludedTypes.includes(type));
    if (beforeExclusion.length && afterExclusion.length !== beforeExclusion.length) {
      filters.types = afterExclusion.length ? afterExclusion : activePromptTypes.length ? activePromptTypes : undefined;
      notes.push(
        `the prompt excluded ${expandedSelectionLabel(excludedTypes, MEDIA_TYPE_OPTIONS)}, so I ignored conflicting menu choices`,
      );
    }
  }

  return {
    filters,
    note: notes.length ? `* ${sentenceCase(notes.join("; "))}.` : undefined,
  };
}

export function buildRecommendationUrl(prompt: string, filters: RecommendationFilters) {
  const params = new URLSearchParams({ q: prompt });
  filters.types?.forEach((type) => params.append(FILTER_PARAM_KEYS.type, type));
  filters.times?.forEach((time) => params.append(FILTER_PARAM_KEYS.time, time));
  return `/recommendations?${params.toString()}`;
}

export function parseMediaTypes(values: string[]) {
  return values.filter(isMediaType);
}

export function parseTimeFrames(values: string[]) {
  return values.filter(isTimeFrame);
}

function compactSelectionLabel<T extends string>(
  values: T[] | undefined,
  options: { value: T; label: string }[],
  fallback: string,
  pluralName: string,
) {
  if (!values?.length) return fallback;
  const first = options.find((option) => option.value === values[0])?.label ?? fallback;
  if (values.length === 1) return first;
  if (values.length === options.length) return `All ${pluralName}`;
  return `${first} +${values.length - 1}`;
}

function expandedSelectionLabel<T extends string>(values: T[], options: { value: T; label: string }[]) {
  return values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter(Boolean)
    .join(", ");
}

function compactStringLabel(values: string[], pluralName: string) {
  if (values.length === 1) return values[0];
  return `${values[0]} +${values.length - 1} ${pluralName}`;
}

function uniqueMediaTypes(values: MediaType[]) {
  return MEDIA_TYPE_OPTIONS.map((option) => option.value).filter((value) => values.includes(value));
}

function uniqueStrings(values: string[]): string[] {
  return canonicalFilterPlatformLabels(values);
}

function mediaTypesFromExclusions(exclusions: string[]) {
  const text = exclusions.join(" ").toLowerCase();
  return MEDIA_TYPE_OPTIONS.map((option) => option.value).filter((type) => {
    if (type === "show") return /\b(tv|show|shows|series)\b/.test(text);
    if (type === "movie") return /\b(movie|movies|film|films)\b/.test(text);
    if (type === "podcast") return /\b(podcast|podcasts)\b/.test(text);
    return /\b(book|books|novel|novels|reading)\b/.test(text);
  });
}

function sentenceCase(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function timeFramesOverlapPromptLimit(times: TimeFrame[], timeLimit: PromptConstraints["timeLimit"]) {
  if (typeof timeLimit.minMinutes !== "number" && typeof timeLimit.maxMinutes !== "number") return true;
  return times.some((time) => {
    const range = expandMenuRange(timeFrameMinuteRange(time));
    if (typeof timeLimit.maxMinutes === "number" && typeof range.minMinutes === "number" && range.minMinutes > timeLimit.maxMinutes) return false;
    if (typeof timeLimit.minMinutes === "number" && typeof range.maxMinutes === "number" && range.maxMinutes < timeLimit.minMinutes) return false;
    return true;
  });
}

function matchesDurationFilter(durationMinutes: number | undefined, filters: RecommendationFilters) {
  if (typeof durationMinutes !== "number") return true;

  const promptRange: MinuteRange = {
    minMinutes: filters.minMinutes,
    maxMinutes: filters.maxMinutes,
  };
  const menuRanges: MinuteRange[] = filters.times?.length ? filters.times.map((time) => expandMenuRange(timeFrameMinuteRange(time))) : [{}];

  return menuRanges.some((menuRange) => {
    const range = {
      minMinutes: maxDefined(menuRange.minMinutes, promptRange.minMinutes),
      maxMinutes: minDefined(menuRange.maxMinutes, promptRange.maxMinutes),
    };
    if (typeof range.minMinutes === "number" && durationMinutes < range.minMinutes) return false;
    if (typeof range.maxMinutes === "number" && durationMinutes > range.maxMinutes) return false;
    return true;
  });
}

function expandMenuRange(range: MinuteRange): MinuteRange {
  return {
    minMinutes: typeof range.minMinutes === "number" ? Math.floor(range.minMinutes * 0.8) : undefined,
    maxMinutes: typeof range.maxMinutes === "number" ? Math.ceil(range.maxMinutes * 1.2) : undefined,
  };
}

function minDefined(...values: (number | undefined)[]) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  return numbers.length ? Math.min(...numbers) : undefined;
}

function maxDefined(...values: (number | undefined)[]) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  return numbers.length ? Math.max(...numbers) : undefined;
}

function timeFrameMinuteRange(time: TimeFrame): MinuteRange {
  if (time === "under-15") return { maxMinutes: 15 };
  if (time === "15-30") return { minMinutes: 15, maxMinutes: 30 };
  if (time === "30-60") return { minMinutes: 30, maxMinutes: 60 };
  if (time === "60-120") return { minMinutes: 60, maxMinutes: 120 };
  if (time === "120-plus") return { minMinutes: 120 };
  return { minMinutes: 60 };
}

function resolveVagueMovieTimeFrame(
  promptConstraints: PromptConstraints,
  activePromptTypes: MediaType[],
  menuTypes: MediaType[],
): TimeFrame | undefined {
  const typeContext = activePromptTypes.length ? activePromptTypes : menuTypes;
  if (typeContext.length && !typeContext.includes("movie")) return undefined;
  if (hasExplicitMinuteOrHour(promptConstraints.timeLimit.rawText)) return undefined;

  const rawText = promptConstraints.timeLimit.rawText.toLowerCase();
  if (/\b(short|shorter|quick|brief|not too long|light runtime|easy runtime)\b/.test(rawText)) return "60-120";
  if (/\b(long|longer|lengthy|epic|marathon|overlong)\b/.test(rawText)) return "120-plus";
  return undefined;
}

function hasExplicitMinuteOrHour(value: string) {
  return /\d+\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\b/i.test(value);
}
