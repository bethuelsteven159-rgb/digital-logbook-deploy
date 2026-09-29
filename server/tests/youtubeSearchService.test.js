const test = require("node:test");
const assert = require("node:assert/strict");

const {
  searchLearningVideos,
  clearSearchCache,
} = require("../services/youtubeSearchService");

function fakeResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function sampleItems(count = 6) {
  return Array.from({ length: count }, (_, i) => ({
    id: { videoId: `vid${i}` },
    snippet: {
      title: `Video &amp; ${i}`,
      channelTitle: "Learn Channel",
      publishedAt: "2026-01-01T00:00:00Z",
      thumbnails: { medium: { url: `https://img.test/${i}.jpg` } },
    },
  }));
}

test.beforeEach(() => clearSearchCache());

test("searchLearningVideos returns at most 5 mapped videos", async () => {
  const result = await searchLearningVideos("javascript", {
    apiKey: "test-key",
    fetchImpl: async () => fakeResponse({ items: sampleItems(6) }),
  });

  assert.equal(result.videos.length, 5);
  assert.equal(result.videos[0].videoId, "vid0");
  assert.equal(result.videos[0].title, "Video & 0");
  assert.equal(result.videos[0].url, "https://www.youtube.com/watch?v=vid0");
  assert.equal(result.cached, false);
});

test("searchLearningVideos rejects a blank query with 400", async () => {
  await assert.rejects(
    searchLearningVideos("   ", { apiKey: "test-key" }),
    (error) => error.statusCode === 400,
  );
});

test("searchLearningVideos returns 503 when the key is missing", async () => {
  const original = process.env.YOUTUBE_API_KEY;
  delete process.env.YOUTUBE_API_KEY;

  try {
    await assert.rejects(
      searchLearningVideos("javascript"),
      (error) => error.statusCode === 503,
    );
  } finally {
    if (original !== undefined) process.env.YOUTUBE_API_KEY = original;
  }
});

test("searchLearningVideos maps quota errors to 503", async () => {
  await assert.rejects(
    searchLearningVideos("javascript", {
      apiKey: "test-key",
      fetchImpl: async () => fakeResponse({}, { ok: false, status: 403 }),
    }),
    (error) => error.statusCode === 503,
  );
});

test("searchLearningVideos maps other provider failures to 502", async () => {
  await assert.rejects(
    searchLearningVideos("javascript", {
      apiKey: "test-key",
      fetchImpl: async () => fakeResponse({}, { ok: false, status: 500 }),
    }),
    (error) => error.statusCode === 502,
  );
});

test("searchLearningVideos returns 504 on timeout", async () => {
  await assert.rejects(
    searchLearningVideos("javascript", {
      apiKey: "test-key",
      timeoutMs: 10,
      fetchImpl: (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    }),
    (error) => error.statusCode === 504,
  );
});

test("searchLearningVideos caches repeated queries", async () => {
  let calls = 0;
  const options = {
    apiKey: "test-key",
    fetchImpl: async () => {
      calls += 1;
      return fakeResponse({ items: sampleItems(2) });
    },
  };

  await searchLearningVideos("Arrays", options);
  const second = await searchLearningVideos("  arrays ", options);

  assert.equal(calls, 1);
  assert.equal(second.cached, true);
});

test("searchLearningVideos skips items without a videoId", async () => {
  const result = await searchLearningVideos("javascript", {
    apiKey: "test-key",
    fetchImpl: async () =>
      fakeResponse({ items: [{ id: {}, snippet: { title: "Channel" } }] }),
  });

  assert.deepEqual(result.videos, []);
});
