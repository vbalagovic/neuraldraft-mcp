import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Paginated list of blog posts. Filter by status, language, category, tag.
 * Sort by created_at or published_at (asc / desc via leading hyphen).
 *
 * Read-only; 0 credits.
 */
export function registerListBlogPostsTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "list_blog_posts",
    {
      title: "List blog posts",
      description: [
        "List the project's blog posts (paginated).",
        "Filter by status (draft|published|scheduled), category slug/name, tag, or language.",
        "Sort by created_at or published_at; prefix with '-' for descending. Defaults to '-created_at'.",
        "Read-only; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        status: z
          .enum(["draft", "published", "scheduled"])
          .optional()
          .describe("Filter by post status."),
        lang: z
          .string()
          .max(10)
          .optional()
          .describe("Language code; picks the matching translation for title/excerpt/meta_*."),
        category: z
          .string()
          .optional()
          .describe("Category slug or name."),
        tag: z
          .string()
          .optional()
          .describe("Tag slug or name."),
        sort: z
          .enum(["created_at", "published_at", "-created_at", "-published_at"])
          .optional()
          .describe("Sort key. Default '-created_at'."),
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
        const result = await ctx.client.listBlogPosts(input);
        const lines = (result.data ?? []).map(
          (p) =>
            `- /${p.slug} — "${p.title}" (id: ${p.id}, status: ${p.status}${
              p.published_at ? `, published ${p.published_at.slice(0, 10)}` : ""
            })`,
        );
        return {
          content: [
            {
              type: "text",
              text:
                lines.length === 0
                  ? "No blog posts match these filters."
                  : `${result.meta?.total ?? lines.length} post(s):\n${lines.join("\n")}`,
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
