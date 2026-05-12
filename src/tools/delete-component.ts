import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Remove a registered component. Mirrors DELETE /v1/components/{id}.
 * Destructive — the HTML chunk is gone; re-register via `register_component`
 * to bring it back.
 */
export function registerDeleteComponentTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "delete_component",
    {
      title: "Delete a registered component",
      description: [
        "Permanently remove a registered component (editable HTML chunk) from the project.",
        "Use when retiring a section that's no longer on the page.",
        "Returns 404 if the component doesn't exist. Destructive — no undo.",
      ].join(" "),
      inputSchema: {
        id: z
          .number()
          .int()
          .min(1)
          .describe(
            "Component id to delete (numeric). Returned by register_component and listed under a page's components.",
          ),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        await ctx.client.deleteComponent(input.id);
        return {
          content: [{ type: "text", text: `Deleted component #${input.id}.` }],
          structuredContent: { id: input.id, deleted: true },
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
