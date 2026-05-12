import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * List galleries (ordered by name). Read-only; 0 credits.
 */
export function registerListGalleriesTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "list_galleries",
    {
      title: "List galleries",
      description: [
        "List galleries for the current project, ordered by name (slug, name, items_count).",
        "Galleries are named, ordered collections of images used by AI-built customer sites.",
        "Read-only; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        page: z.number().int().min(1).optional().describe("1-based page number. Default 1."),
        per_page: z
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
        const result = await ctx.client.listGalleries(input);
        const lines = (result.data ?? []).map(
          (g) => `- ${g.slug} (${g.name}) — ${g.items_count} item(s)`,
        );
        const total =
          (result.meta as { total?: number } | undefined)?.total ?? lines.length;
        return {
          content: [
            {
              type: "text",
              text:
                lines.length === 0
                  ? "No galleries yet. Use create_gallery to add one."
                  : `${total} gallery(ies):\n${lines.join("\n")}`,
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
