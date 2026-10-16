import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Pages of the hosted website in its own design (POST/PATCH/DELETE /v1/site/pages):
 * a new page or sub-page made from one of the site's pages, or an added page
 * published, taken offline or deleted.
 */
export function registerAddSitePageTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "add_site_page",
    {
      title: "Add a page to the hosted site",
      description: [
        "Adds a page or sub-page (e.g. services/wedding-cakes) to the workspace's hosted website, in the site's own design:",
        "it reuses one of the site's pages (template, default the home page) with its header, footer, CSS and JS.",
        "content \"copy\" starts from that page's content with its own editable texts and pictures; \"empty\" is a heading and a paragraph in the site's styles.",
        "menu adds a link to the site's menu. Served in every language and listed in the sitemap.",
        "With only path and state, it publishes, takes offline or deletes a page added this way (the site's own pages are never deleted).",
        "Public: confirm with the person first. Free.",
      ].join(" "),
      inputSchema: {
        path: z.string().max(120).describe("Address, e.g. \"services/wedding-cakes\". Default: from the title."),
        title: z.string().max(120).optional().describe("Page title (and menu label). Needed for a new page."),
        template: z.string().optional().describe("Page to start from, e.g. \"/\" (home, default) or \"/about\"."),
        content: z.enum(["copy", "empty"]).optional().describe("copy (default) or empty."),
        menu: z.boolean().optional().describe("Link it in the site's menu."),
        published: z.boolean().optional().describe("Default true."),
        description: z.string().max(500).optional().describe("Search description."),
        state: z.enum(["published", "unpublished", "deleted"]).optional().describe("For an existing added page: publish, take offline or delete it."),
      },
    },
    async ({ path, title, template, content, menu, published, description, state }): Promise<CallToolResult> => {
      try {
        if (state === "deleted") {
          const res = await ctx.client.deleteSitePage(path);
          return { content: [{ type: "text", text: `Deleted the page ${res.path}.` }], structuredContent: res as unknown as Record<string, unknown> };
        }
        if (state || !title) {
          const patch: Record<string, unknown> = {};
          if (state) patch.published = state === "published";
          if (menu !== undefined) patch.menu = menu;
          if (description !== undefined) patch.description = description;
          const page = await ctx.client.updateSitePage(path, patch);
          return {
            content: [{ type: "text", text: `${page.title} (${page.path}) is ${page.published ? "live at " + page.url : "offline"}${page.in_menu ? ", in the menu" : ""}.` }],
            structuredContent: page as unknown as Record<string, unknown>,
          };
        }
        const page = await ctx.client.createSitePage({ title, path, template, content, menu, published, description });
        return {
          content: [
            {
              type: "text",
              text: `Page added: ${page.title} at ${page.url} (made from ${page.template ?? "/"}, ${page.content === "empty" ? "empty section" : "copy with its own texts"}${page.in_menu ? ", in the menu" : ""}). Change its texts with the content tools or in the dashboard: ${page.edit_url ?? "Website → Edit site"}.`,
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
