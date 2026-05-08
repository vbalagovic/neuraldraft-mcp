import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { makeTestServer, TEST_API_BASE } from "./helpers/make-server.js";

describe("resources", () => {
  let teardown: (() => Promise<void>) | null = null;

  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(async () => {
    if (teardown) await teardown();
    teardown = null;
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("brand://current", () => {
    it("returns the brand JSON from GET /brand", async () => {
      nock(TEST_API_BASE)
        .get("/brand")
        .matchHeader("authorization", /^Bearer ndsk_test_/)
        .reply(200, {
          voice: "warm and grounded",
          audience: "yoga-curious adults",
          colors: { primary: { hex: "#3F6B5C", name: "deep sage" } },
        });

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = await client.readResource({ uri: "brand://current" });
      expect(res.contents).toHaveLength(1);
      const first = res.contents[0]!;
      expect(first.uri).toBe("brand://current");
      expect(first.mimeType).toBe("application/json");
      const parsed = JSON.parse(first.text as string);
      expect(parsed.voice).toBe("warm and grounded");
      expect(parsed.colors.primary.hex).toBe("#3F6B5C");
    });

    it("caches the brand response for ~60s (only one upstream call)", async () => {
      const scope = nock(TEST_API_BASE)
        .get("/brand")
        .reply(200, { voice: "first" });

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      await client.readResource({ uri: "brand://current" });
      await client.readResource({ uri: "brand://current" });
      await client.readResource({ uri: "brand://current" });

      expect(scope.isDone()).toBe(true);
      expect(nock.pendingMocks()).toHaveLength(0);
    });

    it("propagates auth errors from the API", async () => {
      nock(TEST_API_BASE).get("/brand").reply(401, "unauthorized");
      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      await expect(
        client.readResource({ uri: "brand://current" }),
      ).rejects.toThrow();
    });
  });

  describe("schema://* resources", () => {
    it("returns blog post schema as JSON Schema", async () => {
      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = await client.readResource({ uri: "schema://blog-post" });
      const first = res.contents[0]!;
      expect(first.mimeType).toBe("application/schema+json");
      const schema = JSON.parse(first.text as string);
      expect(schema.title).toBe("BlogPost");
      expect(schema.properties.slug.type).toBe("string");
      expect(schema.required).toContain("slug");
    });

    it("returns product schema", async () => {
      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;
      const res = await client.readResource({ uri: "schema://product" });
      const schema = JSON.parse(res.contents[0]!.text as string);
      expect(schema.title).toBe("Product");
      expect(schema.properties.price_cents.type).toBe("integer");
    });

    it("returns booking schema", async () => {
      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;
      const res = await client.readResource({ uri: "schema://booking" });
      const schema = JSON.parse(res.contents[0]!.text as string);
      expect(schema.properties.service.required).toContain("duration_minutes");
    });
  });

  describe("conventions://* resources", () => {
    it("returns editable-html conventions as markdown", async () => {
      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;
      const res = await client.readResource({ uri: "conventions://editable-html" });
      const first = res.contents[0]!;
      expect(first.mimeType).toBe("text/markdown");
      const text = first.text as string;
      expect(text).toMatch(/data-translate/);
      expect(text).toMatch(/data-image-key/);
      expect(text).toMatch(/register_component/);
    });

    it("returns api-usage conventions as markdown", async () => {
      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;
      const res = await client.readResource({ uri: "conventions://api-usage" });
      const text = res.contents[0]!.text as string;
      expect(text).toMatch(/Bearer ndsk_/);
      expect(text).toMatch(/X-RateLimit-Limit/);
      expect(text).toMatch(/Idempotency-Key/);
    });
  });

  it("lists all advertised resources", async () => {
    const { client, cleanup } = await makeTestServer();
    teardown = cleanup;

    const res = await client.listResources();
    const uris = res.resources.map((r) => r.uri);
    expect(uris).toEqual(
      expect.arrayContaining([
        "brand://current",
        "schema://blog-post",
        "schema://product",
        "schema://booking",
        "conventions://editable-html",
        "conventions://api-usage",
      ]),
    );
  });
});
