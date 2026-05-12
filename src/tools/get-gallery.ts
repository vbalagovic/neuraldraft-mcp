import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Fetch a single gallery (with all its items). Read-only; 0 credits.
 */
export function registerGetGalleryTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "get_gallery",
    {
      title: "Get a gallery",
      description: [
        "Fetch a gallery by slug. Returns name + ordered items array of {url, alt}.",
        "Use list_galleries first if you don't know the slug.",
        "Read-only; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        slug: z
          .string()
          .min(1)
          .describe("Gallery slug, e.g. 'home-carousel'."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const gallery = await ctx.client.getGallery(input.slug);
        const itemLines = (gallery.items ?? []).map(
          (item, idx) =>
            `  ${idx + 1}. ${item.url}${item.alt ? ` (alt: "${item.alt}")` : ""}`,
        );
        return {
          content: [
            {
              type: "text",
              text: [
                `Gallery "${gallery.name}" (slug: ${gallery.slug}) — ${gallery.items_count} item(s):`,
                ...(itemLines.length > 0 ? itemLines : ["  (empty)"]),
              ].join("\n"),
            },
          ],
          structuredContent: gallery as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
