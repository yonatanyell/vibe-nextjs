import type { Recommendation } from "./store";
import { applyRecommendationFilters, type RecommendationFilters } from "./filters";

const POSTERS = {
  dusk: "linear-gradient(135deg,#3b2a5a 0%,#7a4a8c 45%,#e3a7c8 100%)",
  ocean: "linear-gradient(140deg,#1f2a52 0%,#5566a8 50%,#a9c3e8 100%)",
  ember: "linear-gradient(150deg,#2a1530 0%,#7a3357 50%,#f0a48a 100%)",
  meadow: "linear-gradient(135deg,#23423b 0%,#5d8a72 50%,#dbe8b8 100%)",
  noir: "linear-gradient(160deg,#101015 0%,#2a2438 50%,#7a6a9a 100%)",
  honey: "linear-gradient(135deg,#3a2a18 0%,#a07037 55%,#f4d49a 100%)",
  rose: "linear-gradient(150deg,#3d1d3a 0%,#9b4f80 50%,#f6c0c8 100%)",
  glacier: "linear-gradient(140deg,#1a3340 0%,#4f7d96 50%,#cde6ec 100%)",
  cosmos: "linear-gradient(135deg,#1a1438 0%,#4b3a8a 50%,#b9a8e8 100%)",
};

export const LIBRARY: Recommendation[] = [
  {
    id: "succession",
    type: "show",
    title: "Succession",
    creator: "Jesse Armstrong",
    year: 2018,
    cast: ["Brian Cox", "Jeremy Strong", "Sarah Snook"],
    platforms: ["HBO Max"],
    ratings: [
      { source: "IMDb", value: "8.9" },
      { source: "Rotten Tomatoes", value: "94%" },
      { source: "Google", value: "96%" },
    ],
    length: "4 seasons - 39 episodes",
    durationMinutes: 60,
    tags: ["sharp", "ambitious", "dialogue-driven"],
    why: "Built around the kind of cutting, intelligent dialogue and ambitious characters you tend to gravitate toward.",
    summary: "A media dynasty fractures as a fading patriarch's children scheme for the throne - wickedly funny, brutally human.",
    social: "92% of users with similar taste loved this.",
    poster: POSTERS.noir,
    accent: "#a78bda",
  },
  {
    id: "shrinking",
    type: "show",
    title: "Shrinking",
    creator: "Bill Lawrence, Jason Segel",
    year: 2023,
    cast: ["Jason Segel", "Harrison Ford", "Jessica Williams"],
    platforms: ["Apple TV+"],
    ratings: [
      { source: "IMDb", value: "8.3" },
      { source: "Rotten Tomatoes", value: "84%" },
      { source: "Google", value: "93%" },
    ],
    length: "2 seasons - 22 episodes",
    durationMinutes: 30,
    tags: ["warm", "witty", "emotionally honest"],
    why: "Balances depth with warmth - a softer landing for the same emotional intelligence you love in heavier dramas.",
    summary: "A grieving therapist starts breaking the rules with his patients - and starts living again in the process.",
    social: "88% of users with similar taste enjoyed this.",
    poster: POSTERS.honey,
    accent: "#f0c48a",
  },
  {
    id: "afterhours",
    type: "podcast",
    title: "After Hours",
    creator: "Harvard Business School",
    year: 2015,
    platforms: ["Spotify", "Apple Podcasts"],
    ratings: [
      { source: "Apple Podcasts", value: "4.6" },
      { source: "Spotify", value: "4.7" },
    ],
    length: "Avg. 35 min - weekly",
    durationMinutes: 35,
    tags: ["smart", "ambitious", "current"],
    why: "Three professors unpack the week with the kind of curious, ambitious lens you reach for when you want to feel sharper.",
    summary: "A weekly conversation about business, tech and the forces shaping how we work.",
    social: "Trending among listeners with your taste profile.",
    poster: POSTERS.ocean,
    accent: "#8aa9d8",
  },
  {
    id: "darkmatter",
    type: "book",
    title: "Dark Matter",
    creator: "Blake Crouch",
    year: 2016,
    platforms: ["Kindle Unlimited", "Audible"],
    ratings: [
      { source: "Goodreads", value: "4.2" },
      { source: "Amazon", value: "4.6" },
      { source: "Google", value: "4.5" },
    ],
    length: "352 pages - ~10h audiobook",
    durationMinutes: 600,
    tags: ["intense", "cerebral", "page-turner"],
    why: "Cerebral, propulsive, and quietly emotional - the sweet spot you gravitate toward late at night.",
    summary: "A physicist is abducted into a life that isn't his and must claw his way back to the family he loves.",
    social: "Frequently saved by readers like you.",
    poster: POSTERS.cosmos,
    accent: "#b9a8e8",
  },
  {
    id: "thebear",
    type: "show",
    title: "The Bear",
    creator: "Christopher Storer",
    year: 2022,
    cast: ["Jeremy Allen White", "Ayo Edebiri", "Ebon Moss-Bachrach"],
    platforms: ["Disney+", "Hulu"],
    ratings: [
      { source: "IMDb", value: "8.6" },
      { source: "Rotten Tomatoes", value: "99%" },
      { source: "Google", value: "95%" },
    ],
    length: "3 seasons - 28 episodes",
    durationMinutes: 30,
    tags: ["intense", "tender", "character-driven"],
    why: "Tense and tender at once - chaotic energy with genuine warmth underneath.",
    summary: "A young chef returns to Chicago to run his late brother's sandwich shop and the family it has become.",
    social: "Loved by 90% of viewers with your taste.",
    poster: POSTERS.ember,
    accent: "#f0a48a",
  },
  {
    id: "huberman",
    type: "podcast",
    title: "Huberman Lab",
    creator: "Andrew Huberman",
    year: 2021,
    platforms: ["Spotify", "Apple Podcasts", "YouTube"],
    ratings: [
      { source: "Apple Podcasts", value: "4.8" },
      { source: "Spotify", value: "4.8" },
    ],
    length: "Avg. 2h - weekly",
    durationMinutes: 120,
    tags: ["scientific", "deep", "actionable"],
    why: "Deep-dive science with practical takeaways - perfect for a long drive and a curious mood.",
    summary: "A Stanford neuroscientist explores how biology shapes performance, mood and health.",
    social: "Top pick among learners with your profile.",
    poster: POSTERS.glacier,
    accent: "#9cc9d6",
  },
  {
    id: "normalpeople",
    type: "book",
    title: "Normal People",
    creator: "Sally Rooney",
    year: 2018,
    platforms: ["Kindle Unlimited", "Audible"],
    ratings: [
      { source: "Goodreads", value: "3.8" },
      { source: "Amazon", value: "4.4" },
      { source: "Google", value: "4.3" },
    ],
    length: "266 pages - ~7h audiobook",
    durationMinutes: 420,
    tags: ["emotional", "quiet", "intimate"],
    why: "Quietly emotional with intelligent dialogue - the kind of intimacy you tend to save for tonight.",
    summary: "Two young people in Ireland keep finding their way back to each other across the years.",
    social: "Saved often by readers with your taste.",
    poster: POSTERS.rose,
    accent: "#f3b6c4",
  },
  {
    id: "pastlives",
    type: "movie",
    title: "Past Lives",
    creator: "Celine Song",
    year: 2023,
    cast: ["Greta Lee", "Teo Yoo", "John Magaro"],
    platforms: ["Prime Video", "Apple TV+"],
    ratings: [
      { source: "IMDb", value: "7.8" },
      { source: "Rotten Tomatoes", value: "96%" },
      { source: "Google", value: "92%" },
    ],
    length: "1h 45m",
    durationMinutes: 105,
    tags: ["tender", "reflective", "romantic"],
    why: "Reflective and emotionally generous - exactly the calm depth you asked for.",
    summary: "Two childhood friends reunite in New York twenty years on, and weigh the lives they didn't choose.",
    social: "Adored by viewers who liked Normal People.",
    poster: POSTERS.dusk,
    accent: "#e3a7c8",
  },
  {
    id: "tedlasso",
    type: "show",
    title: "Ted Lasso",
    creator: "Bill Lawrence",
    year: 2020,
    cast: ["Jason Sudeikis", "Hannah Waddingham", "Brett Goldstein"],
    platforms: ["Apple TV+"],
    ratings: [
      { source: "IMDb", value: "8.7" },
      { source: "Rotten Tomatoes", value: "92%" },
      { source: "Google", value: "97%" },
    ],
    length: "3 seasons - 34 episodes",
    durationMinutes: 35,
    tags: ["comforting", "warm", "uplifting"],
    why: "A reliable mood-lift - warmth with just enough wit to feel grown-up.",
    summary: "An American football coach is hired to manage an English Premier League team. He has no idea about football.",
    social: "Top comfort pick for users like you.",
    poster: POSTERS.meadow,
    accent: "#bdd994",
  },
];

function rankedRecommendations(prompt: string): Recommendation[] {
  const p = prompt.toLowerCase();
  const score = (rec: Recommendation) => {
    let s = 0;
    for (const tag of rec.tags) if (p.includes(tag)) s += 3;
    if (rec.type === "podcast" && /(podcast|drive|listen|learn)/.test(p)) s += 4;
    if (rec.type === "book" && /(book|read|novel)/.test(p)) s += 4;
    if (rec.type === "movie" && /(movie|film|tonight|hour|short)/.test(p)) s += 2;
    if (rec.type === "show" && /(show|series|watch|binge|seasons?)/.test(p)) s += 2;
    if (/smart|ambitious|intelligent/.test(p) && /smart|ambitious|sharp/.test(rec.tags.join(" "))) s += 3;
    if (/light|comfort|warm|easy|cozy/.test(p) && /warm|comforting|tender|witty/.test(rec.tags.join(" "))) s += 3;
    if (/emotional|deep|tender|quiet/.test(p) && /emotional|tender|quiet|reflective/.test(rec.tags.join(" "))) s += 4;
    if (/dark|intense|stress/.test(p) && /intense|sharp/.test(rec.tags.join(" "))) s += 2;
    if (/less.*stress|less.*dark/.test(p) && /warm|tender|comforting/.test(rec.tags.join(" "))) s += 4;
    if (/scien|learn|knowledge|smart/.test(p) && /scientific|smart/.test(rec.tags.join(" "))) s += 3;
    if (/succession|breaking bad/.test(p) && (rec.id === "thebear" || rec.id === "shrinking" || rec.id === "darkmatter")) s += 5;
    if (/shrinking/.test(p) && (rec.id === "tedlasso" || rec.id === "pastlives")) s += 4;
    return s;
  };
  return [...LIBRARY].sort((a, b) => score(b) - score(a));
}

export function recommend(prompt: string, filters: RecommendationFilters = {}): Recommendation[] {
  const ranked = rankedRecommendations(prompt || "");
  const filtered = applyRecommendationFilters(ranked, filters);
  const typeFiltered = filters.types?.length ? applyRecommendationFilters(ranked, { types: filters.types }) : ranked;
  return (filtered.length ? filtered : typeFiltered).slice(0, 3);
}

export function aiResponseFor(prompt: string): string {
  const p = prompt.trim();
  if (!p) return "Tell me what you're in the mood for - a feeling, an evening, a show you loved.";
  if (/succession|breaking bad/i.test(p)) return "Got it. You like sharp, character-driven storytelling - here are three that share that DNA without the same weight.";
  if (/podcast|drive|learn/i.test(p)) return "An hour to yourself and a curious mind - these will keep you company without wasting it.";
  if (/light|comfort|warm/i.test(p)) return "Something smart but easy to live with - these three lean warm.";
  if (/emotional|deep|tonight/i.test(p)) return "For a quiet, emotionally honest night - start with the first one.";
  return "Here's what feels right for that. The first is the strongest fit; the others are alternates if you want to drift.";
}

export const REFINEMENT_CHIPS = [
  "Too dark",
  "Less intense",
  "More emotional",
  "Shorter",
  "More ambitious",
  "Funnier",
  "Already seen similar",
  "Not in the mood",
];
