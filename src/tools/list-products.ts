import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * List the project's products. Useful when the AI is about to scaffold a
 * /products page so it knows the real data instead of placeholder mock data.
 *
 * Read-only, no credits consumed.
 */
export function registerListProductsTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "list_products",
    {
      title: "List products",
      description:
        "List the project's products (paginated). Read-only; does not consume credits. Use before scaffolding a storefront so you generate cards for real items.",
      inputSchema: {
        page: z.number().int().min(1).optional().describe("1-based page number. Default 1."),
        page_size: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Items per page (1-100). Default 20."),
        status: z
          .enum(["draft", "active", "archived"])
          .optional()
          .describe("Filter by product status."),
      },
    },
    async ({ page, page_size, status }): Promise<CallToolResult> => {
      try {
        const result = await ctx.client.listProducts({ page, page_size, status });
        return {
          content: [
            {
              type: "text",
              text: `${result.data.length} product(s) returned${
                result.meta ? ` (page ${result.meta.page}/${
                  Math.ceil(result.meta.total / Math.max(result.meta.page_size, 1))
                }, total ${result.meta.total})` : ""
              }.`,
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
