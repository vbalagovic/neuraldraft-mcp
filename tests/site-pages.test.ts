import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { makeTestServer, TEST_API_BASE } from "./helpers/make-server.js";

interface CallToolResultLite {
  isError?: boolean;
  content: Array<{ type: string; text: string }>;
  structuredContent?: Record<string, unknown>;
}

const page = {
  kind: "added", id: 7, title: "Wedding cakes", path: "/services/wedding-cakes",
  url: "https://linden.example/services/wedding-cakes", published: true, in_menu: true,
  template: "/", content: "copy", deletable: true, edit_url: "/admin/site/edit?page=%2Fservices%2Fwedding-cakes",
};

describe("add_site_page", () => {
  let teardown: (() => Promise<void>) | null = null;
  beforeEach(() => nock.disableNetConnect());
  afterEach(async () => {
    if (teardown) await teardown();
    teardown = null;
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("adds a sub-page from the home page", async () => {
    nock(TEST_API_BASE).post("/site/pages", (b) => b.title === "Wedding cakes" && b.path === "services/wedding-cakes" && b.menu === true).reply(201, { data: page });
    const { client, cleanup } = await makeTestServer();
    teardown = cleanup;
    const res = (await client.callTool({ name: "add_site_page", arguments: { title: "Wedding cakes", path: "services/wedding-cakes", template: "/", menu: true } })) as CallToolResultLite;
    expect(res.isError).toBeFalsy();
    expect(res.content[0]!.text).toContain("https://linden.example/services/wedding-cakes");
    expect((res.structuredContent as { path: string }).path).toBe("/services/wedding-cakes");
  });

  it("takes a page offline and deletes it by path", async () => {
    nock(TEST_API_BASE).patch("/site/pages/services/wedding-cakes", { published: false }).reply(200, { data: { ...page, published: false } });
    nock(TEST_API_BASE).delete("/site/pages/services/wedding-cakes").reply(200, { data: { deleted: true, path: "/services/wedding-cakes" } });
    const { client, cleanup } = await makeTestServer();
    teardown = cleanup;
    const off = (await client.callTool({ name: "add_site_page", arguments: { path: "/services/wedding-cakes", state: "unpublished" } })) as CallToolResultLite;
    expect(off.content[0]!.text).toContain("offline");
    const del = (await client.callTool({ name: "add_site_page", arguments: { path: "services/wedding-cakes", state: "deleted" } })) as CallToolResultLite;
    expect(del.content[0]!.text).toContain("Deleted the page /services/wedding-cakes");
  });
});
