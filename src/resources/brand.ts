import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerContext } from "../server.js";

const CACHE_TTL_MS = 60_000;

/**
 * `brand://current` — exposes the project's brand context to the AI.
 *
 * This resource is the one the AI should read FIRST in any build session.
 * Voice / colors / fonts / audience flow into every subsequent generation.
 *
 * Cached in-process for 60s — brand changes are rare and the LLM will read
 * this many times per session.
 */
export function registerBrandResource(server: McpServer, ctx: ServerContext): void {
  let cache: { at: number; text: string } | null = null;

  server.registerResource(
    "brand-current",
    "brand://current",
    {
      title: "Brand context",
      description:
        "Current project brand: voice, audience, content tone, colors, fonts, logo, target topics. Read this BEFORE generating any UI or copy so the output is on-brand.",
      mimeType: "application/json",
    },
    async (uri) => {
      const now = Date.now();
      if (cache && now - cache.at < CACHE_TTL_MS) {
        return {
          contents: [
            { uri: uri.href, mimeType: "application/json", text: cache.text },
          ],
        };
      }
      const brand = await ctx.client.getBrand();
      const text = JSON.stringify(brand, null, 2);
      cache = { at: now, text };
      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text }],
      };
    },
  );
}
