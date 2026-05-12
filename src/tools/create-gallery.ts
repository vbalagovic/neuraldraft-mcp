import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Create a new gallery. Slug is auto-derived from name when omitted;
 * collisions get -2, -3, ... suffixed.
 */
export function registerCreateGalleryTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "create_gallery",
    {
      title: "Create a gallery",
      description: [
        "Create a new gallery (named, ordered collection of image URLs).",
        "Slug is auto-derived from name when omitted. If the derived slug exists, -2, -3, ... is appended.",
        "Items are optional at create time — start empty and add via update_gallery.",
        "Max 200 items per gallery; each item is {url, alt?}.",
      ].join(" "),
      inputSchema: {
        name: z
          .string()
          .min(1)
          .max(255)
          .describe("Human-readable name, e.g. 'Home carousel'."),
        slug: z
          .string()
          .regex(/^[a-z0-9][a-z0-9-]{0,254}$/)
          .optional()
          .describe(
            "Optional explicit slug, lowercase a-z/0-9/hyphen. Omit to auto-derive from name.",
          ),
        items: z
          .array(
            z.object({
              url: z.string().url().max(2000).describe("Image URL."),
              alt: z.string().max(255).optional().describe("Optional alt text."),
            }),
          )
          .max(200)
          .optional()
          .describe("Optional initial items (max 200)."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const gallery = await ctx.client.createGallery(input);
        return {
          content: [
            {
              type: "text",
              text: `Created gallery "${gallery.name}" (slug: ${gallery.slug}) with ${gallery.items_count} item(s).`,
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
