import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestServer } from "./helpers/make-server.js";

describe("prompts", () => {
  let teardown: (() => Promise<void>) | null = null;

  beforeEach(() => {
    // No network needed for prompt tests.
  });

  afterEach(async () => {
    if (teardown) await teardown();
    teardown = null;
  });

  it("lists every advertised prompt", async () => {
    const { client, cleanup } = await makeTestServer();
    teardown = cleanup;
    const list = await client.listPrompts();
    const names = list.prompts.map((p) => p.name).sort();
    expect(names).toEqual(
      ["connect_existing_site", "scaffold_blog_page", "scaffold_marketing_site"].sort(),
    );
  });

  it("scaffold_blog_page renders with framework + language", async () => {
    const { client, cleanup } = await makeTestServer();
    teardown = cleanup;

    const res = await client.getPrompt({
      name: "scaffold_blog_page",
      arguments: { framework: "next", language: "en" },
    });

    expect(res.messages).toHaveLength(1);
    const text = (res.messages[0]!.content as { text: string }).text;
    expect(text).toMatch(/next/);
    expect(text).toMatch(/brand:\/\/current/);
    expect(text).toMatch(/schema:\/\/blog-post/);
    expect(text).toMatch(/register_component/);
    expect(text).toMatch(/lang=en/);
  });

  it("scaffold_marketing_site mentions all required resources and tools", async () => {
    const { client, cleanup } = await makeTestServer();
    teardown = cleanup;

    const res = await client.getPrompt({
      name: "scaffold_marketing_site",
      arguments: { framework: "astro", sections: "hero,features,cta" },
    });

    const text = (res.messages[0]!.content as { text: string }).text;
    expect(text).toMatch(/brand:\/\/current/);
    expect(text).toMatch(/conventions:\/\/editable-html/);
    expect(text).toMatch(/conventions:\/\/api-usage/);
    expect(text).toMatch(/register_component/);
    expect(text).toMatch(/generate_image/);
    expect(text).toMatch(/hero,features,cta/);
    expect(text).toMatch(/astro/);
  });

  it("connect_existing_site renders for plain html sites", async () => {
    const { client, cleanup } = await makeTestServer();
    teardown = cleanup;

    const res = await client.getPrompt({
      name: "connect_existing_site",
      arguments: { framework: "html" },
    });

    const text = (res.messages[0]!.content as { text: string }).text;
    expect(text).toMatch(/data-translate/);
    expect(text).toMatch(/data-image-key/);
    expect(text).toMatch(/create_translation_keys/);
    expect(text).toMatch(/EDITING\.md/);
  });

  it("scaffold_marketing_site rejects an unknown framework", async () => {
    const { client, cleanup } = await makeTestServer();
    teardown = cleanup;

    await expect(
      client.getPrompt({
        name: "scaffold_marketing_site",
        arguments: { framework: "fortran" },
      }),
    ).rejects.toThrow();
  });
});
