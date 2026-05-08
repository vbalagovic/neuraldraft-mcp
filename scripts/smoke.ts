// Live smoke test for the MCP client against http://localhost/v1
// Run with: NEURALDRAFT_API_KEY=ndsk_live_xxx npx tsx scripts/smoke.ts
import { NeuralDraftClient } from "../src/client.js";

const apiKey = process.env.NEURALDRAFT_API_KEY;
if (!apiKey) {
  console.error("Set NEURALDRAFT_API_KEY env var");
  process.exit(1);
}

const client = new NeuralDraftClient({
  apiKey,
  apiUrl: process.env.NEURALDRAFT_API_URL ?? "http://localhost/v1",
  userAgent: "neuraldraft-mcp-smoke/1.0",
});

const results: { name: string; ok: boolean; summary: string }[] = [];

async function run(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    const r = await fn();
    results.push({
      name,
      ok: true,
      summary: typeof r === "object" ? JSON.stringify(r).slice(0, 140) : String(r),
    });
  } catch (err) {
    results.push({
      name,
      ok: false,
      summary: err instanceof Error ? err.message.slice(0, 240) : String(err),
    });
  }
}

await run("getBrand", () => client.getBrand());
await run("listProducts", () => client.listProducts({ page_size: 5 }));
await run("registerComponent", () =>
  client.registerComponent({
    html: '<section><h1 data-translate="hero.headline">Hello</h1></section>',
    intent: "marketing_hero",
    page_slug: "home",
  }),
);
await run("createTranslationKeys", () =>
  client.createTranslationKeys({ "hero.cta": "Get started" }, "en"),
);

console.log("");
for (const r of results) {
  console.log(`${r.ok ? "✓" : "✗"} ${r.name.padEnd(24)} ${r.summary}`);
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
