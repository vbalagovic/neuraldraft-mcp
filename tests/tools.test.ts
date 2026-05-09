import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { makeTestServer, TEST_API_BASE } from "./helpers/make-server.js";

interface CallToolResultLite {
  isError?: boolean;
  content: Array<{ type: string; text: string }>;
  structuredContent?: Record<string, unknown>;
}

describe("tools", () => {
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

  it("lists every advertised tool", async () => {
    const { client, cleanup } = await makeTestServer();
    teardown = cleanup;
    const list = await client.listTools();
    const names = list.tools.map((t) => t.name).sort();
    // Compare via Set to keep this test resilient as new tools are added —
    // we just want to assert the core surface is present, not enumerate every
    // tool exhaustively (the latter turns this into a snapshot churn factory).
    const expected = new Set([
      "create_translation_keys",
      "generate_blog_post",
      "generate_image",
      "get_job",
      "get_product",
      "list_products",
      "register_component",
      "setup_booking_widget",
      "list_images",
      "get_image",
      "register_image",
      "replace_image",
      "delete_image",
    ]);
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  describe("register_component", () => {
    it("returns component_id and translation keys on success", async () => {
      nock(TEST_API_BASE)
        .post("/components/register", (body: Record<string, unknown>) =>
          body.intent === "marketing_hero" &&
          typeof body.html === "string" &&
          (body.html as string).includes("data-translate=\"hero.headline\""),
        )
        .matchHeader("authorization", /^Bearer ndsk_test_/)
        .matchHeader("content-type", /application\/json/)
        .reply(201, {
          id: "cmp_2Ngd9KqLmRpW",
          intent: "marketing_hero",
          page_slug: "home",
          html: "<section>...</section>",
          keys_created: ["hero.headline", "hero.subhead", "hero.cta"],
          editor_url: "https://app.neuraldraft.io/c/cmp_2Ngd9KqLmRpW",
          created_at: "2026-04-19T10:14:02Z",
          updated_at: "2026-04-19T10:14:02Z",
        });

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "register_component",
        arguments: {
          html: '<section><h1 data-translate="hero.headline">Hi</h1></section>',
          intent: "marketing_hero",
          page_slug: "home",
        },
      })) as CallToolResultLite;

      expect(res.isError).toBeFalsy();
      expect(res.structuredContent).toEqual({
        component_id: "cmp_2Ngd9KqLmRpW",
        translation_keys: ["hero.headline", "hero.subhead", "hero.cta"],
        image_keys: [],
        editor_url: "https://app.neuraldraft.io/c/cmp_2Ngd9KqLmRpW",
      });
      expect(res.content[0]!.text).toMatch(/Component registered: cmp_/);
    });

    it("surfaces 401 as a friendly error result (not a thrown exception)", async () => {
      nock(TEST_API_BASE).post("/components/register").reply(401, "invalid api key");

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "register_component",
        arguments: { html: "<h1>Hi</h1>", intent: "hero" },
      })) as CallToolResultLite;

      expect(res.isError).toBe(true);
      expect(res.content[0]!.text).toMatch(/api key/i);
    });

    it("surfaces 422 with the API's body", async () => {
      nock(TEST_API_BASE)
        .post("/components/register")
        .reply(422, JSON.stringify({ code: "invalid_html", detail: "missing closing tag" }));

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "register_component",
        arguments: { html: "<section>", intent: "hero" },
      })) as CallToolResultLite;

      expect(res.isError).toBe(true);
      expect(res.content[0]!.text).toMatch(/invalid/i);
    });
  });

  describe("generate_blog_post", () => {
    it("returns a job_id on success", async () => {
      nock(TEST_API_BASE)
        .post("/blog-posts", (body: Record<string, unknown>) => {
          const ai = body.ai as Record<string, unknown> | undefined;
          return (
            ai !== undefined &&
            ai.topic === "5-minute breathwork" &&
            ai.word_count === 1200
          );
        })
        .reply(202, {
          id: "job_abc",
          type: "blog_post.generate",
          status: "pending",
          progress: 0,
          created_at: "2026-04-19T10:14:02Z",
        });

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "generate_blog_post",
        arguments: { topic: "5-minute breathwork", word_count: 1200 },
      })) as CallToolResultLite;

      expect(res.isError).toBeFalsy();
      expect(res.structuredContent?.job_id).toBe("job_abc");
      expect(res.content[0]!.text).toMatch(/job_abc/);
    });

    it("maps 402 (out of credits) to a clear error", async () => {
      nock(TEST_API_BASE)
        .post("/blog-posts")
        .reply(402, JSON.stringify({ code: "out_of_credits", detail: "0 credits" }));

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "generate_blog_post",
        arguments: { topic: "five-minute breathwork" },
      })) as CallToolResultLite;

      expect(res.isError).toBe(true);
      expect(res.content[0]!.text).toMatch(/out of credits|credits/i);
    });

    it("forwards translate_to as translate_to_languages", async () => {
      nock(TEST_API_BASE)
        .post("/blog-posts", (body: Record<string, unknown>) => {
          const ai = body.ai as Record<string, unknown>;
          return Array.isArray(ai.translate_to_languages) &&
            (ai.translate_to_languages as string[]).includes("de");
        })
        .reply(202, { id: "job_de", type: "blog_post.generate", status: "pending", created_at: "x" });

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "generate_blog_post",
        arguments: { topic: "morning routines", translate_to: ["de", "fr"] },
      })) as CallToolResultLite;

      expect(res.isError).toBeFalsy();
      expect(res.structuredContent?.job_id).toBe("job_de");
    });
  });

  describe("generate_image", () => {
    it("returns a job for a valid prompt", async () => {
      nock(TEST_API_BASE)
        .post("/images", (body: Record<string, unknown>) =>
          body.prompt === "Sage yoga studio" && body.aspect_ratio === "16:9",
        )
        .reply(202, {
          id: "job_img_1",
          type: "image.generate",
          status: "pending",
          created_at: "x",
        });

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "generate_image",
        arguments: { prompt: "Sage yoga studio", aspect_ratio: "16:9" },
      })) as CallToolResultLite;

      expect(res.isError).toBeFalsy();
      expect(res.structuredContent?.job_id).toBe("job_img_1");
    });
  });

  describe("create_translation_keys", () => {
    it("creates each key via PUT /content/{key}", async () => {
      nock(TEST_API_BASE)
        .put("/content/nav.home")
        .reply(200, { key: "nav.home", value: "Home" });
      nock(TEST_API_BASE)
        .put("/content/nav.about")
        .reply(200, { key: "nav.about", value: "About" });

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "create_translation_keys",
        arguments: { keys: { "nav.home": "Home", "nav.about": "About" } },
      })) as CallToolResultLite;

      expect(res.isError).toBeFalsy();
      const sc = res.structuredContent as { created: string[]; skipped_existing: string[] };
      expect(sc.created.sort()).toEqual(["nav.about", "nav.home"]);
      expect(sc.skipped_existing).toEqual([]);
    });

    it("treats 409 as 'skipped_existing' rather than failing the whole batch", async () => {
      nock(TEST_API_BASE)
        .put("/content/nav.home")
        .reply(409, JSON.stringify({ code: "key_exists" }));
      nock(TEST_API_BASE)
        .put("/content/nav.new")
        .reply(200, { key: "nav.new", value: "New" });

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "create_translation_keys",
        arguments: { keys: { "nav.home": "Home", "nav.new": "New" } },
      })) as CallToolResultLite;

      expect(res.isError).toBeFalsy();
      const sc = res.structuredContent as { created: string[]; skipped_existing: string[] };
      expect(sc.created).toEqual(["nav.new"]);
      expect(sc.skipped_existing).toEqual(["nav.home"]);
    });
  });

  describe("list_products / get_product", () => {
    it("list_products returns paginated data", async () => {
      nock(TEST_API_BASE)
        .get("/products")
        .query({ page: "1", page_size: "20" })
        .reply(200, {
          data: [
            { id: 1, name: "Mat", price_cents: 4900, currency: "USD", status: "active" },
            { id: 2, name: "Block", price_cents: 1500, currency: "USD", status: "active" },
          ],
          meta: { page: 1, page_size: 20, total: 2 },
        });

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "list_products",
        arguments: { page: 1, page_size: 20 },
      })) as CallToolResultLite;

      expect(res.isError).toBeFalsy();
      const sc = res.structuredContent as { data: unknown[] };
      expect(sc.data).toHaveLength(2);
    });

    it("get_product returns the product", async () => {
      nock(TEST_API_BASE)
        .get("/products/42")
        .reply(200, {
          id: 42,
          name: "Premium mat",
          price_cents: 8900,
          currency: "USD",
          status: "active",
        });

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "get_product",
        arguments: { id: 42 },
      })) as CallToolResultLite;

      expect(res.isError).toBeFalsy();
      expect((res.structuredContent as { name: string }).name).toBe("Premium mat");
    });
  });

  describe("setup_booking_widget", () => {
    it("returns embed_html and snippet_url", async () => {
      nock(TEST_API_BASE)
        .get("/bookable-services/svc_yoga_60")
        .reply(200, { id: "svc_yoga_60", name: "60-min yoga", duration_minutes: 60 });

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "setup_booking_widget",
        arguments: { service_id: "svc_yoga_60" },
      })) as CallToolResultLite;

      expect(res.isError).toBeFalsy();
      const sc = res.structuredContent as {
        embed_html: string;
        snippet_url: string;
        service_id: string;
      };
      expect(sc.snippet_url).toMatch(/widgets\/booking\/svc_yoga_60\.js$/);
      expect(sc.embed_html).toMatch(/<script src="/);
      expect(sc.embed_html).toMatch(/svc_yoga_60/);
    });

    it("returns a friendly 404 if the service does not exist", async () => {
      nock(TEST_API_BASE).get("/bookable-services/missing").reply(404, "not found");

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "setup_booking_widget",
        arguments: { service_id: "missing" },
      })) as CallToolResultLite;

      expect(res.isError).toBe(true);
      expect(res.content[0]!.text).toMatch(/not found|missing/i);
    });
  });

  describe("get_job", () => {
    it("returns the job status", async () => {
      nock(TEST_API_BASE).get("/jobs/job_abc").reply(200, {
        id: "job_abc",
        type: "blog_post.generate",
        status: "completed",
        progress: 100,
        result: { post_id: 123, slug: "morning-routines" },
        created_at: "x",
      });

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "get_job",
        arguments: { id: "job_abc" },
      })) as CallToolResultLite;

      expect(res.isError).toBeFalsy();
      expect(res.content[0]!.text).toMatch(/completed/);
      expect(res.content[0]!.text).toMatch(/post_id/);
    });

    it("surfaces a 5xx as a server-error message", async () => {
      nock(TEST_API_BASE).get("/jobs/job_x").reply(503, "down");

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "get_job",
        arguments: { id: "job_x" },
      })) as CallToolResultLite;

      expect(res.isError).toBe(true);
      expect(res.content[0]!.text).toMatch(/unavailable|503/);
    });
  });

  describe("rate-limit handling", () => {
    it("maps 429 to a retry-friendly message", async () => {
      nock(TEST_API_BASE).post("/components/register").reply(429, "slow down");

      const { client, cleanup } = await makeTestServer();
      teardown = cleanup;

      const res = (await client.callTool({
        name: "register_component",
        arguments: { html: "<h1>Hi</h1>", intent: "hero" },
      })) as CallToolResultLite;

      expect(res.isError).toBe(true);
      expect(res.content[0]!.text).toMatch(/rate limit/i);
    });
  });
});
