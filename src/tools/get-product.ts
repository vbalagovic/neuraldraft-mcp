import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Fetch a single product by id (or slug, depending on platform support).
 * Read-only, no credits.
 */
export function registerGetProductTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "get_product",
    {
      title: "Get a product",
      description:
        "Fetch a single product by id. Read-only; does not consume credits. Use when scaffolding a /products/[slug] page.",
      inputSchema: {
        id: z
          .union([z.string().min(1), z.number().int().positive()])
          .describe("Product id (numeric) or slug (string)."),
      },
    },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const product = await ctx.client.getProduct(id);
        return {
          content: [
            {
              type: "text",
              text: `Product '${product.name}' (id=${product.id}) loaded.`,
            },
          ],
          structuredContent: product as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
