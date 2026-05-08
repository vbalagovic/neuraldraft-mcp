import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * List newsletter subscribers captured by the project's
 * `POST /v1/newsletters/subscribe` public endpoint.
 *
 * Read-only — does not consume credits. Requires an API key with `forms:read`
 * (or `*`) scope.
 */
export function registerListNewsletterSubscribersTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "list_newsletter_subscribers",
    {
      title: "List newsletter subscribers",
      description: [
        "List the project's captured newsletter subscribers (id, email, app_lead, subscribed_at).",
        "Read-only; doesn't consume credits.",
        "Use app_lead=true to filter to/from app-lead-only signups.",
      ].join(" "),
      inputSchema: {
        app_lead: z
          .boolean()
          .optional()
          .describe(
            "Filter to subscribers flagged as 'app leads' (e.g. came from a 'want the app' surface) vs. regular newsletter signups.",
          ),
        search: z
          .string()
          .max(255)
          .optional()
          .describe("Substring match on email."),
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
        const result = await ctx.client.listNewsletterSubscribers(input);
        const lines = (result.data ?? []).map(
          (n) =>
            `- ${n.email}${n.app_lead ? " 📱" : ""} (id: ${n.id}${n.subscribed_at ? `, ${n.subscribed_at.slice(0, 10)}` : ""})`,
        );
        return {
          content: [
            {
              type: "text",
              text:
                lines.length === 0
                  ? "No newsletter subscribers yet."
                  : `${result.meta?.total ?? lines.length} subscriber(s):\n${lines.join("\n")}`,
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
