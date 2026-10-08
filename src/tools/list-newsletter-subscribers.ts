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
        "List the project's captured newsletter subscribers (id, email, app_lead, source, language, subscribed_at, unsubscribed_at).",
        "Read-only; doesn't consume credits.",
        "Use app_lead=true to filter to/from app-lead-only signups, source to filter by signup source (end with * for a prefix, e.g. meltdown-guide-*), subscribed=true to hide unsubscribed people.",
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
        source: z
          .string()
          .max(191)
          .optional()
          .describe(
            "Signup source sent with the subscribe request, e.g. 'meltdown-guide-en'. End with * to match a prefix ('meltdown-guide-*').",
          ),
        language: z.string().max(12).optional().describe("Signup language, e.g. 'en'."),
        subscribed: z
          .boolean()
          .optional()
          .describe("true = still subscribed only, false = unsubscribed only."),
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
          (n) => {
            const details = [
              `id: ${n.id}`,
              n.subscribed_at ? n.subscribed_at.slice(0, 10) : null,
              n.source ? `source: ${n.source}` : null,
              n.language ? `lang: ${n.language}` : null,
              n.unsubscribed_at ? `unsubscribed ${n.unsubscribed_at.slice(0, 10)}` : null,
            ].filter(Boolean);
            return `- ${n.email}${n.app_lead ? " 📱" : ""} (${details.join(", ")})`;
          },
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
