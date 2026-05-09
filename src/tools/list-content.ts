import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Paginated translation-key listing. Filter by `search` substring or by
 * `scope` (page|component|global).
 *
 * Read-only; 0 credits.
 */
export function registerListContentTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "list_content",
    {
      title: "List translation keys",
      description: [
        "List the project's translation keys (paginated).",
        "Use `search` for substring match on key name, `scope` to narrow to page/component/global, and `lang` to pick which language's value is returned alongside the all_locales map.",
        "Read-only; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        search: z
          .string()
          .max(255)
          .optional()
          .describe("Substring filter on the key name (e.g. 'hero.' returns hero.headline, hero.cta, …)."),
        scope: z
          .enum(["page", "component", "global"])
          .optional()
          .describe("Narrow to a single scope. Defaults to all."),
        lang: z
          .string()
          .max(10)
          .optional()
          .describe("Language code for the resolved value. Defaults to project default_language."),
        page: z.number().int().min(1).optional().describe("1-based page number. Default 1."),
        page_size: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe("Items per page (1–200). Default 50."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const result = await ctx.client.listContent(input);
        const lines = (result.data ?? []).map(
          (c) => `- ${c.key}: ${c.value ?? "—"}`,
        );
        return {
          content: [
            {
              type: "text",
              text:
                lines.length === 0
                  ? "No translation keys match these filters."
                  : `${result.meta?.total ?? lines.length} key(s):\n${lines.join("\n")}`,
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
