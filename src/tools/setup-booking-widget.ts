import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Resolve the embed snippet for a bookable service. The customer pastes the
 * returned HTML into their AI-built site (Lovable, Next.js, Astro, plain
 * HTML — works anywhere).
 */
export function registerSetupBookingWidgetTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "setup_booking_widget",
    {
      title: "Get the booking widget embed",
      description: [
        "Resolve the embed HTML + script URL for a bookable service.",
        "Drop the returned `embed_html` into the page where the booking flow should appear.",
        "Read-only; does not consume credits.",
      ].join(" "),
      inputSchema: {
        service_id: z
          .union([z.string().min(1), z.number().int().positive()])
          .describe("ID of the bookable service (from list_bookable_services or the project admin)."),
      },
    },
    async ({ service_id }): Promise<CallToolResult> => {
      try {
        const result = await ctx.client.getBookingWidget(service_id);
        return {
          content: [
            {
              type: "text",
              text: [
                "Drop this into the page:",
                "",
                result.embed_html,
                "",
                `(Direct script URL: ${result.snippet_url})`,
              ].join("\n"),
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
