import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Fetch a single page by id or slug. Returns the full SEO meta block so
 * the AI can decide whether to update or leave it alone.
 */
export function registerGetPageTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "get_page",
    {
      title: "Get a page",
      description: [
        "Fetch a single page (slug, title, type, SEO meta) by id or slug.",
        "Read-only; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        id_or_slug: z
          .union([z.string().min(1), z.number().int().positive()])
          .describe("Numeric page id or string slug (e.g. 'home')."),
      },
    },
    async ({ id_or_slug }): Promise<CallToolResult> => {
      try {
        const page = await ctx.client.getPage(id_or_slug);
        const lines = [
          `**${page.title}** — /${page.slug} (id: ${page.id})`,
          `- type: ${page.type}`,
          `- homepage: ${page.is_homepage ? "yes" : "no"}`,
          `- active: ${page.is_active ? "yes" : "no"}`,
          `- meta_title: ${page.meta_title ?? "—"}`,
          `- meta_description: ${page.meta_description ?? "—"}`,
          `- og_title: ${page.og_title ?? "—"}`,
          `- og_image: ${page.og_image ?? "—"}`,
          `- canonical_url: ${page.canonical_url ?? "—"}`,
        ];
        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: page as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
