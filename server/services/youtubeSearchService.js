const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RESULTS = 5;
const MAX_QUERY_LENGTH = 100;
const CACHE_TTL_MS = 10 * 60 * 1000;

const cache = new Map();

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeQuery(query) {
  return String(query ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);
}

function mapVideo(item) {
  const videoId = item?.id?.videoId;
  const snippet = item?.snippet || {};
  if (!videoId) return null;

  return {
    videoId,
    title: decodeEntities(snippet.title),
    channel: decodeEntities(snippet.channelTitle),
    thumbnail:
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      null,
    publishedAt: snippet.publishedAt || null,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

async function searchLearningVideos(query, options = {}) {
  const cleanQuery = normalizeQuery(query);

  if (!cleanQuery) {
    throw createHttpError(400, "A search term is required.");
  }

  const apiKey = options.apiKey || process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw createHttpError(503, "YouTube search is not configured.");
  }

  const now = options.now || Date.now();
  const cacheKey = cleanQuery.toLowerCase();
  const cached = cache.get(cacheKey);

  if (cached && now - cached.storedAt < CACHE_TTL_MS) {
    return { ...cached.result, cached: true };
  }

  const timeoutMs = Number(
    options.timeoutMs || process.env.YOUTUBE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
  );
  const fetchImpl = options.fetchImpl || fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: String(MAX_RESULTS),
    q: `${cleanQuery} tutorial`,
    safeSearch: "strict",
    videoEmbeddable: "true",
    key: apiKey,
  });

  try {
    const response = await fetchImpl(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
      { method: "GET", signal: controller.signal },
    );

    if (!response.ok) {
      const providerBody = await response.text().catch(() => "");

      console.error(
        "YouTube search request failed:",
        response.status,
        providerBody.slice(0, 500),
      );

      // 403 covers quotaExceeded; 429 is rate limiting.
      if (response.status === 403 || response.status === 429) {
        throw createHttpError(
          503,
          "YouTube search is temporarily unavailable. Please try again later.",
        );
      }

      throw createHttpError(502, "YouTube search is temporarily unavailable.");
    }

    const payload = await response.json();

    const videos = (Array.isArray(payload?.items) ? payload.items : [])
      .map(mapVideo)
      .filter(Boolean)
      .slice(0, MAX_RESULTS);

    const result = { query: cleanQuery, videos, provider: "youtube" };

    cache.set(cacheKey, { storedAt: now, result });

    return { ...result, cached: false };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createHttpError(504, "YouTube search took too long. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function clearSearchCache() {
  cache.clear();
}

module.exports = { searchLearningVideos, clearSearchCache, normalizeQuery };
