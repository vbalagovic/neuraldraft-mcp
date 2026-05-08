import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Patch a page — slug / title / status / per-field SEO meta. Only the
 * fields you pass are updated; the rest are preserved (merge semantics).
 */
export function registerUpdatePageTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "update_page",
    {
      title: "Update a page",
      description: [
        "Patch a page's fields and/or SEO meta. Only the fields you pass are touched.",
        "Use this to backfill meta_* on a page that was auto-created by register_component.",
        "Free; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        id: z.number().int().positive().describe("Numeric page id (use list_pages or get_page to find it)."),
        slug: z
          .string()
          .regex(/^[a-z0-9\-\/]+$/)
          .optional()
          .describe("New URL slug — collides with other pages will 409."),
        title: z.string().optional().describe("New page title."),
        type: z
          .enum(["landing", "blog_list", "blog_post", "legal"])
          .optional()
          .describe("Page type."),
        is_homepage: z
          .boolean()
          .optional()
          .describe("Promote to homepage (any previous homepage is demoted)."),
        is_active: z.boolean().optional(),
        exclude_from_search: z.boolean().optional(),
        meta_title: z.string().nullable().optional().describe("Pass null to clear."),
        meta_description: z.string().nullable().optional(),
        og_title: z.string().nullable().optional(),
        og_description: z.string().nullable().optional(),
        og_image: z.string().url().nullable().optional(),
        canonical_url: z.string().url().nullable().optional(),
      },
    },
    async ({ id, ...rest }): Promise<CallToolResult> => {
      try {
        const page = await ctx.client.updatePage(id, rest);
        return {
          content: [
            {
              type: "text",
              text: `Page updated: id=${page.id}, slug=/${page.slug}, title="${page.title}".`,
            },
          ],
          structuredContent: page as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
