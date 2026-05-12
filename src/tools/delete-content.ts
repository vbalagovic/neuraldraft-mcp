import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Remove a content / translation key across all locales.
 * Mirrors DELETE /v1/content/{key}. Destructive — there is no undo.
 */
export function registerDeleteContentTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "delete_content",
    {
      title: "Delete a content key",
      description: [
        "Permanently remove a content / translation key and all its locale values.",
        "Use when retiring copy that's no longer rendered anywhere on the site.",
        "Returns 404 if the key doesn't exist. Destructive — no undo.",
      ].join(" "),
      inputSchema: {
        key: z
          .string()
          .min(1)
          .describe(
            "Content key to delete, e.g. 'hero.headline' or 'gallery.home-carousel'.",
          ),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        await ctx.client.deleteContent(input.key);
        return {
          content: [
            { type: "text", text: `Deleted content key "${input.key}".` },
          ],
          structuredContent: { key: input.key, deleted: true },
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
