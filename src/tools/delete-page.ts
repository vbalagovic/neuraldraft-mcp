import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Remove a page. Soft-retires by default (sets is_active=false so its slug
 * stops resolving) — pass `force=true` for a hard delete that drops the row.
 * Mirrors DELETE /v1/pages/{id}.
 */
export function registerDeletePageTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "delete_page",
    {
      title: "Delete a page",
      description: [
        "Remove a page. Defaults to soft-retire (is_active=false), which is reversible via `update_page`.",
        "Pass `force: true` for a hard delete (irreversible).",
        "The homepage cannot be deleted — promote a different page to homepage first.",
      ].join(" "),
      inputSchema: {
        id: z
          .number()
          .int()
          .min(1)
          .describe("Page id to delete (numeric). Use list_pages to look up ids."),
        force: z
          .boolean()
          .optional()
          .describe(
            "Hard delete instead of soft retire. Defaults to false. Destructive — no undo.",
          ),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const force = Boolean(input.force);
        await ctx.client.deletePage(input.id, force);
        const verb = force ? "Hard-deleted" : "Retired (is_active=false)";
        return {
          content: [{ type: "text", text: `${verb} page #${input.id}.` }],
          structuredContent: { id: input.id, deleted: true, force },
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
