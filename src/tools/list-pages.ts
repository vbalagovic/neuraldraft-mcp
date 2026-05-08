import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * List pages for the current project. Useful before registering components
 * so the AI knows which page slugs already exist.
 */
export function registerListPagesTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "list_pages",
    {
      title: "List pages",
      description: [
        "List the project's pages (slug, title, type, is_homepage, is_active).",
        "Read-only; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        type: z
          .enum(["landing", "blog_list", "blog_post", "legal"])
          .optional()
          .describe("Filter by page type."),
        is_active: z.boolean().optional().describe("Filter by active flag."),
        page: z.number().int().min(1).optional().describe("1-based page number. Default 1."),
        page_size: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Items per page (1–100). Default 20."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const result = await ctx.client.listPages(input);
        const lines = (result.data ?? []).map(
          (p) =>
            `- /${p.slug}${p.is_homepage ? " 🏠" : ""}${p.is_active ? "" : " [inactive]"} — "${p.title}" (id: ${p.id}, type: ${p.type})`,
        );
        return {
          content: [
            {
              type: "text",
              text:
                lines.length === 0
                  ? "No pages yet. Use create_page to add one."
                  : `${result.meta?.total ?? lines.length} page(s):\n${lines.join("\n")}`,
            },
          ],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
