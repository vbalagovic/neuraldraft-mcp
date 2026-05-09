import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * List registered image keys. Useful before regenerating or replacing so the
 * AI can confirm a key exists and see the current URL. Read-only; 0 credits.
 */
export function registerListImagesTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "list_images",
    {
      title: "List registered images",
      description: [
        "List image keys registered for the current project (key, url, updated_at).",
        "Optional `prefix` narrows by user-key prefix (e.g. 'hero.' returns hero.background, hero.foreground).",
        "Read-only; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        prefix: z
          .string()
          .optional()
          .describe("Filter by user-key prefix, e.g. 'hero.' or 'gallery.'."),
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
        const result = await ctx.client.listImages(input);
        const lines = (result.data ?? []).map(
          (img) => `- ${img.key} → ${img.url ?? "(no url)"}`,
        );
        return {
          content: [
            {
              type: "text",
              text:
                lines.length === 0
                  ? "No images registered yet. Use generate_image (AI) or register_image (direct URL) to add one."
                  : `${result.meta?.total ?? lines.length} image(s):\n${lines.join("\n")}`,
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
