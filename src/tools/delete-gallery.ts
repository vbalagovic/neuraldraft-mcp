import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Delete a gallery. Destructive — the gallery and its item list are gone.
 * Underlying image URLs are NOT touched (they live in MediaLibrary / Images).
 */
export function registerDeleteGalleryTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "delete_gallery",
    {
      title: "Delete a gallery",
      description: [
        "Permanently delete a gallery by slug. Destructive — no undo.",
        "Only removes the gallery record (slug + ordered item list).",
        "Does NOT delete the underlying image URLs or registered images — those live separately.",
      ].join(" "),
      inputSchema: {
        slug: z
          .string()
          .min(1)
          .describe("Gallery slug to delete, e.g. 'home-carousel'."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        await ctx.client.deleteGallery(input.slug);
        return {
          content: [{ type: "text", text: `Deleted gallery "${input.slug}".` }],
          structuredContent: { slug: input.slug, deleted: true },
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
