import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * List contact-form submissions captured by the project's
 * `POST /v1/contact-forms` public endpoint.
 *
 * Read-only — does not consume credits. Requires an API key with `forms:read`
 * (or `*`) scope.
 */
export function registerListContactFormSubmissionsTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "list_contact_form_submissions",
    {
      title: "List contact-form submissions",
      description: [
        "List the project's captured contact-form submissions (id, email, subject, message, data).",
        "Read-only; doesn't consume credits.",
        "Use search= to substring-match against email, subject, or message.",
      ].join(" "),
      inputSchema: {
        search: z
          .string()
          .max(255)
          .optional()
          .describe("Substring match against email, subject, or message body."),
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
        const result = await ctx.client.listContactFormSubmissions(input);
        const lines = (result.data ?? []).map(
          (c) =>
            `- ${c.email}${c.subject ? ` — "${c.subject}"` : ""} (id: ${c.id}${c.submitted_at ? `, ${c.submitted_at.slice(0, 10)}` : ""})`,
        );
        return {
          content: [
            {
              type: "text",
              text:
                lines.length === 0
                  ? "No contact-form submissions yet."
                  : `${result.meta?.total ?? lines.length} submission(s):\n${lines.join("\n")}`,
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
