import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Register or update an image key with a direct URL (no AI generation).
 * Useful when the AI already has a stock photo / hosted asset and just needs
 * to bind it to a stable key. Synchronous; 0 credits.
 */
export function registerRegisterImageTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "register_image",
    {
      title: "Register or update an image URL",
      description: [
        "Bind a direct image URL to a stable key (e.g. 'hero.background' → https://cdn.example.com/hero.webp).",
        "Idempotent — calling twice with the same key swaps the URL.",
        "Costs 0 credits. For AI-generated images use generate_image instead.",
      ].join(" "),
      inputSchema: {
        key: z
          .string()
          .min(1)
          .regex(/^[\w.\-\/]+$/, "Key must match ^[\\w.\\-\\/]+$")
          .describe("Stable image key, e.g. 'hero.background' or 'gallery/shot1'."),
        url: z
          .string()
          .url()
          .max(2000)
          .describe("Direct image URL (must be publicly accessible)."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const img = await ctx.client.registerImage(input.key, input.url);
        return {
          content: [
            {
              type: "text",
              text: `Registered ${img.key} → ${img.url}`,
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
