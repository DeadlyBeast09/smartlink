const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const urlService = require("../services/urlService");
const Url = require("../models/Url");

/**
 * These tests target the SERVICE layer directly, not HTTP — proving the
 * earlier claim in services/urlService.js that business logic is testable
 * without Express in the loop. (controllers + routes get integration-style
 * tests with supertest once auth exists and there's a real flow to test —
 * see tests/url.routes.test.js, added in Phase 2.)
 *
 * mongodb-memory-server spins up a real, throwaway MongoDB binary in
 * memory — so these tests exercise actual Mongoose behavior (including
 * the unique index) without touching your dev/prod database.
 */
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Url.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("urlService.createShortUrl", () => {
  test("creates a url document with a generated shortId and 0 clicks", async () => {
    const url = await urlService.createShortUrl("https://example.com/some/page");
    expect(url.originalUrl).toBe("https://example.com/some/page");
    expect(url.shortId).toHaveLength(7);
    expect(url.clicks).toBe(0);
  });

  test("rejects a missing originalUrl", async () => {
    await expect(urlService.createShortUrl()).rejects.toThrow(
      "originalUrl is required"
    );
  });

  test("rejects a malformed URL", async () => {
    await expect(urlService.createShortUrl("not-a-url")).rejects.toThrow(
      "must be a valid http/https URL"
    );
  });

  test("rejects non-http protocols (e.g. javascript:) to prevent protocol smuggling", async () => {
    await expect(
      urlService.createShortUrl("javascript:alert(1)")
    ).rejects.toThrow("must be a valid http/https URL");
  });

  test("two calls produce different shortIds", async () => {
    const a = await urlService.createShortUrl("https://example.com/a");
    const b = await urlService.createShortUrl("https://example.com/b");
    expect(a.shortId).not.toBe(b.shortId);
  });
});

describe("urlService.getUrlAndTrackClick", () => {
  test("increments clicks atomically on each call", async () => {
    const created = await urlService.createShortUrl("https://example.com/x");

    await urlService.getUrlAndTrackClick(created.shortId);
    const second = await urlService.getUrlAndTrackClick(created.shortId);

    expect(second.clicks).toBe(2);
  });

  test("throws 404 for an unknown shortId", async () => {
    await expect(
      urlService.getUrlAndTrackClick("doesNotExist")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("10 concurrent clicks all land (no lost updates from race conditions)", async () => {
    const created = await urlService.createShortUrl("https://example.com/race");

    await Promise.all(
      Array.from({ length: 10 }).map(() =>
        urlService.getUrlAndTrackClick(created.shortId)
      )
    );

    const fresh = await Url.findOne({ shortId: created.shortId });
    expect(fresh.clicks).toBe(10);
  });
});
