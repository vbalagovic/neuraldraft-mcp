import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Remove an image registration. Does NOT delete underlying CDN bytes — only
 * detaches the key. Subsequent GET /v1/images/{key} returns 404.
 */
export function registerDeleteImageTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "delete_image",
    {
      title: "Delete an image registration",
      description: [
        "Remove an image key registration so the URL is no longer resolvable via GET /v1/images/{key}.",
        "Does NOT delete the underlying CDN bytes; only the key→URL binding.",
        "Returns 404 if the key wasn't registered.",
      ].join(" "),
      inputSchema: {
        key: z
          .string()
          .min(1)
          .describe("Image key to remove, e.g. 'hero.background'."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        await ctx.client.deleteImage(input.key);
        return {
          content: [{ type: "text", text: `Deleted image registration for "${input.key}".` }],
          structuredContent: { key: input.key, deleted: true },
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
