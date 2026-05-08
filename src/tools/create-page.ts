import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Create a Neural Draft page (TenantPage row) with optional SEO meta.
 *
 * Call this BEFORE register_component for that slug if you want a real
 * meta_title / meta_description on the rendered page. If you skip it,
 * register_component will auto-create a stub page that can be patched
 * later via update_page.
 */
export function registerCreatePageTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "create_page",
    {
      title: "Create a page",
      description: [
        "Create a page (slug + title + per-page SEO meta).",
        "Use this for multi-page sites — call once per page, then register_component for each section on that page.",
        "Free; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9\-\/]+$/)
          .describe(
            "URL slug for the page, lowercase + hyphens. Examples: 'home', 'about', 'pricing', 'services/seo'.",
          ),
        title: z
          .string()
          .min(1)
          .describe(
            "Human-readable page title. Used as the default <title> if meta_title is not set.",
          ),
        type: z
          .enum(["landing", "blog_list", "blog_post", "legal"])
          .optional()
          .describe("Page type. Defaults to 'landing'."),
        is_homepage: z
          .boolean()
          .optional()
          .describe(
            "If true, this becomes the site's homepage (and any previous homepage is demoted).",
          ),
        is_active: z
          .boolean()
          .optional()
          .describe("Defaults to true."),
        exclude_from_search: z
          .boolean()
          .optional()
          .describe("Add a noindex tag. Defaults to false."),
        meta_title: z.string().optional().describe("<title> override (≤60 chars recommended)."),
        meta_description: z
          .string()
          .optional()
          .describe("<meta name=description> (≤160 chars recommended)."),
        og_title: z.string().optional().describe("OpenGraph title; falls back to meta_title."),
        og_description: z
          .string()
          .optional()
          .describe("OpenGraph description; falls back to meta_description."),
        og_image: z.string().url().optional().describe("Absolute URL for og:image."),
        canonical_url: z.string().url().optional().describe("Absolute canonical URL."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const page = await ctx.client.createPage(input);
        const out = {
          page_id: page.id,
          slug: page.slug,
          is_homepage: page.is_homepage,
        };
        return {
          content: [
            {
              type: "text",
              text: [
                `Page created: id=${page.id}, slug=/${page.slug}${page.is_homepage ? " (homepage)" : ""}`,
                page.meta_title ? `meta_title: "${page.meta_title}"` : null,
                page.meta_description ? `meta_description: "${page.meta_description}"` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
          structuredContent: out,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
