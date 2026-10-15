import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { makeTestServer, TEST_API_BASE } from "./helpers/make-server.js";

const A = "ndsk_live_aaaaaaaaaaaaaaaaaaaaaaaa";
const B = "ndsk_live_bbbbbbbbbbbbbbbbbbbbbbbb";

describe("agency workspaces", () => {
  let teardown: (() => Promise<void>) | null = null;
  beforeEach(() => nock.disableNetConnect());
  afterEach(async () => {
    if (teardown) await teardown();
    teardown = null;
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("lists configured workspaces and switches the key every tool uses", async () => {
    nock(TEST_API_BASE).matchHeader("authorization", `Bearer ${A}`).get("/brand").times(2).reply(200, { data: { name: "Villa Lavanda" } });
    nock(TEST_API_BASE).matchHeader("authorization", `Bearer ${B}`).get("/brand").times(3).reply(200, { data: { name: "Linden Bakery" } });

    const { client, cleanup } = await makeTestServer({ apiKey: A, workspaces: { villa: A, bakery: B }, activeWorkspace: "villa" });
    teardown = cleanup;

    const list = (await client.callTool({ name: "list_workspaces", arguments: {} })) as { content: Array<{ text: string }> };
    expect(list.content[0]!.text).toMatch(/villa.*← active/);
    expect(list.content[0]!.text).toMatch(/bakery/);

    const sw = (await client.callTool({ name: "switch_workspace", arguments: { workspace: "Bakery" } })) as { content: Array<{ text: string }> };
    expect(sw.content[0]!.text).toMatch(/Active workspace: bakery/);

    // get_brand now goes out with bakery's key.
    const brand = (await client.callTool({ name: "get_brand", arguments: {} })) as { isError?: boolean };
    expect(brand.isError).toBeFalsy();

    const bad = (await client.callTool({ name: "switch_workspace", arguments: { workspace: "nope" } })) as { isError?: boolean; content: Array<{ text: string }> };
    expect(bad.isError).toBe(true);
    expect(bad.content[0]!.text).toMatch(/Configured: villa, bakery/);
  });
});
