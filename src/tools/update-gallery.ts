import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Update a gallery's name and/or items. Items are full-replace — pass the
 * complete final ordered array. Slug is immutable.
 */
export function registerUpdateGalleryTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "update_gallery",
    {
      title: "Update a gallery",
      description: [
        "Update a gallery by slug. Pass `name` to rename, `items` to replace the full ordered list.",
        "Items is a FULL REPLACE — to add or reorder, fetch the current list with get_gallery, mutate, then send the complete new array.",
        "Slug is immutable; max 200 items.",
      ].join(" "),
      inputSchema: {
        slug: z
          .string()
          .min(1)
          .describe("Gallery slug, e.g. 'home-carousel'."),
        name: z
          .string()
          .min(1)
          .max(255)
          .optional()
          .describe("New name. Slug stays the same."),
        items: z
          .array(
            z.object({
              url: z.string().url().max(2000).describe("Image URL."),
              alt: z.string().max(255).optional().describe("Optional alt text."),
            }),
          )
          .max(200)
          .optional()
          .describe("Complete new ordered items list (full replace, max 200)."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const { slug, ...patch } = input;
        const gallery = await ctx.client.updateGallery(slug, patch);
        return {
          content: [
            {
              type: "text",
              text: `Updated gallery "${gallery.name}" (slug: ${gallery.slug}) — now ${gallery.items_count} item(s).`,
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
