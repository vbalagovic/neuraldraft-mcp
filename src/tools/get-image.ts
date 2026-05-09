import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Resolve a single registered image by key. Returns the CDN URL plus
 * created/updated timestamps. Read-only; 0 credits.
 */
export function registerGetImageTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "get_image",
    {
      title: "Get a registered image by key",
      description:
        "Resolve the registered URL for an image key. Returns 404 if the key is not registered.",
      inputSchema: {
        key: z
          .string()
          .min(1)
          .describe("Image key, e.g. 'hero.background'."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const img = await ctx.client.getImage(input.key);
        return {
          content: [
            {
              type: "text",
              text: `${img.key} → ${img.url ?? "(no url)"}`,
            },
          ],
          structuredContent: img as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
