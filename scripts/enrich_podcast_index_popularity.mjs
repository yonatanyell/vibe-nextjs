import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const appDir = process.cwd();
const rootDir = path.resolve(appDir, "..");
const envPath = path.join(appDir, ".env");
const env = fs.existsSync(envPath)
  ? Object.fromEntries(
      fs
        .readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")];
        }),
    )
  : {};

const API_KEY = process.env.PODCAST_INDEX_API_KEY || env.PODCAST_INDEX_API_KEY;
const API_SECRET = process.env.PODCAST_INDEX_API_SECRET || env.PODCAST_INDEX_API_SECRET;
const INPUT = process.env.PODCAST_INDEX_INPUT || path.join(rootDir, "First MVP/New 30/all_items_with_item_ids.csv");
const OUTPUT =
  process.env.PODCAST_INDEX_OUTPUT || path.join(rootDir, "First MVP/New 30/all_items_with_item_ids.podcast_index_enriched.csv");
const USER_AGENT = process.env.PODCAST_INDEX_USER_AGENT || "ContentRecommender/1.0";
const REQUEST_DELAY_MS = Number(process.env.PODCAST_INDEX_DELAY_MS || 250);
const TRENDING_MAX = Number(process.env.PODCAST_INDEX_TRENDING_MAX || 1000);
const BASE_URL = "https://api.podcastindex.org/api/1.0";
const APPLE_REPLACEMENT_BASE_URL = "https://api.podcastindex.org";
const HAS_AUTH = Boolean(API_KEY && API_SECRET);
let authEnabled = HAS_AUTH;

function usage() {
  console.error(`
Missing Podcast Index API key.

Create a free API key at https://api.podcastindex.org/, then add this to vibe-nextjs/.env:

  PODCAST_INDEX_API_KEY=...
  PODCAST_INDEX_USER_AGENT=ContentRecommender/1.0

If your Podcast Index account also shows a Secret Key, add it as:

  PODCAST_INDEX_API_SECRET=...

With a Secret Key, this script also imports Podcast Index trend scores.
Without a Secret Key, it falls back to the no-auth Apple-replacement endpoints and imports episode count/freshness only.

Then run:

  npm run enrich:podcast-index

Optional:
  PODCAST_INDEX_INPUT="${INPUT}"
  PODCAST_INDEX_OUTPUT="${OUTPUT}"
  PODCAST_INDEX_DELAY_MS=${REQUEST_DELAY_MS}
  PODCAST_INDEX_TRENDING_MAX=${TRENDING_MAX}
`);
}

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
  return {
    headers,
    records: records
      .filter((record) => record.some((value) => value.trim()))
      .map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""]))),
  };
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows, headers) {
  const text = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header] ?? "")).join(",")),
  ].join("\n");
  return fsp.writeFile(filePath, `${text}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizedTitle(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function titleSimilarity(a, b) {
  const left = new Set(normalizedTitle(a).split(" ").filter(Boolean));
  const right = new Set(normalizedTitle(b).split(" ").filter(Boolean));
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((token) => right.has(token)).length;
  return overlap / Math.max(left.size, right.size);
}

function extractApplePodcastId(row) {
  const text = [
    row.apple_podcasts_episode_url,
    row.apple_podcasts_url,
    row.source_url,
    row.url,
  ]
    .filter(Boolean)
    .join(" ");
  const match = text.match(/\/id(\d{5,})\b|[?&]id=(\d{5,})\b/i);
  return match?.[1] || match?.[2] || "";
}

function isPodcastRow(row) {
  return (
    row.source_type === "podcast" ||
    row.type === "podcast" ||
    Boolean(row.show_title && (row.apple_podcasts_episode_url || row.spotify_episode_url))
  );
}

function podcastTitleFor(row) {
  return row.show_title || row.parent_podcast_title || row.collectionName || row.title || "";
}

function authHeaders() {
  const authDate = Math.floor(Date.now() / 1000).toString();
  const authorization = createHash("sha1").update(`${API_KEY}${API_SECRET}${authDate}`).digest("hex");

  return {
    "User-Agent": USER_AGENT,
    "X-Auth-Date": authDate,
    "X-Auth-Key": API_KEY,
    Authorization: authorization,
  };
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "User-Agent": USER_AGENT, ...(options.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  }

  return await res.json();
}

async function fetchPodcastIndex(pathname, params = {}) {
  const url = new URL(`${BASE_URL}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  return await fetchJson(url, {
    headers: authHeaders(),
  });
}

function latestEpisodeTimestamp(feed) {
  return (
    Number(feed?.newestItemPublishTime) ||
    Number(feed?.newestItemPubdate) ||
    Number(feed?.lastUpdateTime) ||
    timestampFromDate(feed?.releaseDate) ||
    ""
  );
}

function timestampFromDate(value) {
  if (!value) return 0;
  const timestamp = Date.parse(String(value));
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : 0;
}

function feedIdKeys(feed) {
  return [
    feed?.id ? `id:${feed.id}` : "",
    feed?.collectionId ? `itunes:${feed.collectionId}` : "",
    feed?.itunesId ? `itunes:${feed.itunesId}` : "",
    feed?.title ? `title:${normalizedTitle(feed.title)}` : "",
    feed?.collectionName ? `title:${normalizedTitle(feed.collectionName)}` : "",
  ].filter(Boolean);
}

async function loadTrendingFeeds() {
  if (!authEnabled) return new Map();
  let data;
  try {
    data = await fetchPodcastIndex("/podcasts/trending", { max: TRENDING_MAX });
  } catch (error) {
    console.warn(`Podcast Index authenticated trending unavailable; continuing without trend scores: ${error.message}`);
    authEnabled = false;
    return new Map();
  }
  const feeds = Array.isArray(data.feeds) ? data.feeds : [];
  const byKey = new Map();

  for (const feed of feeds) {
    for (const key of feedIdKeys(feed)) byKey.set(key, feed);
  }

  return byKey;
}

function feedFromItunesResult(result) {
  return {
    ...result,
    id: result.feedId || "",
    title: result.collectionName || result.trackName || "",
    itunesId: result.collectionId || "",
    episodeCount: result.trackCount || "",
    newestItemPubdate: timestampFromDate(result.releaseDate),
  };
}

async function fetchPodcastIndexAppleReplacement(pathname, params = {}) {
  const url = new URL(`${APPLE_REPLACEMENT_BASE_URL}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  return await fetchJson(url);
}

async function lookupFeed(row) {
  const itunesId = extractApplePodcastId(row);
  if (itunesId) {
    if (authEnabled) {
      try {
        const data = await fetchPodcastIndex("/podcasts/byitunesid", { id: itunesId });
        if (data.feed?.id) return data.feed;
      } catch (error) {
        console.warn(`Podcast Index authenticated lookup unavailable; using no-auth fallback: ${error.message}`);
        authEnabled = false;
      }
    }

    const data = await fetchPodcastIndexAppleReplacement("/lookup", { entity: "podcast", id: itunesId });
    if (data.results?.[0]) return feedFromItunesResult(data.results[0]);
    await sleep(REQUEST_DELAY_MS);
  }

  const title = podcastTitleFor(row);
  if (!title) return null;

  let feeds = [];
  if (authEnabled) {
    try {
      const data = await fetchPodcastIndex("/search/bytitle", { q: title, max: 5 });
      feeds = Array.isArray(data.feeds) ? data.feeds : [];
    } catch (error) {
      console.warn(`Podcast Index authenticated search unavailable; using no-auth fallback: ${error.message}`);
      authEnabled = false;
    }
  }

  if (!feeds.length) {
    const data = await fetchPodcastIndexAppleReplacement("/search", { term: title, media: "podcast", entity: "podcast", limit: 5 });
    feeds = Array.isArray(data.results) ? data.results.map(feedFromItunesResult) : [];
  }

  return feeds
    .map((feed) => ({ feed, similarity: titleSimilarity(title, feed.title) }))
    .filter((candidate) => candidate.similarity >= 0.6)
    .sort((a, b) => b.similarity - a.similarity)[0]?.feed ?? null;
}

async function main() {
  if (!API_KEY) {
    usage();
    process.exitCode = 1;
    return;
  }

  const { headers, records } = parseCsv(await fsp.readFile(INPUT, "utf8"));
  const outputHeaders = [
    ...headers,
    "podcast_index_feed_id",
    "podcast_index_itunes_id",
    "podcast_index_trend_score",
    "podcast_index_episode_count",
    "podcast_index_latest_episode_timestamp",
  ].filter((header, index, all) => all.indexOf(header) === index);

  const trendingByKey = await loadTrendingFeeds();
  await sleep(REQUEST_DELAY_MS);
  console.log(
    authEnabled
      ? "Podcast Index enrichment: authenticated mode with trend scores."
      : "Podcast Index enrichment: no-secret fallback mode; trend scores will be 0.",
  );

  let enriched = 0;
  let unmatched = 0;
  const rows = [];

  for (const row of records) {
    if (!isPodcastRow(row)) {
      rows.push(row);
      continue;
    }

    try {
      const feed = await lookupFeed(row);
      if (!feed) {
        unmatched += 1;
        rows.push(row);
        continue;
      }

      const trendFeed = feedIdKeys(feed).map((key) => trendingByKey.get(key)).find(Boolean);
      rows.push({
        ...row,
        podcast_index_feed_id: feed.id || "",
        podcast_index_itunes_id: feed.itunesId || feed.collectionId || extractApplePodcastId(row),
        podcast_index_trend_score: trendFeed?.trendScore ?? 0,
        podcast_index_episode_count: feed.episodeCount ?? "",
        podcast_index_latest_episode_timestamp: latestEpisodeTimestamp(feed),
      });
      enriched += 1;
    } catch (error) {
      console.warn(`Podcast Index lookup failed for "${podcastTitleFor(row)}": ${error.message}`);
      rows.push(row);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  await writeCsv(OUTPUT, rows, outputHeaders);
  console.log(`Wrote ${OUTPUT}`);
  console.log(`Podcast rows enriched: ${enriched}`);
  console.log(`Podcast rows unmatched: ${unmatched}`);
}

await main();
