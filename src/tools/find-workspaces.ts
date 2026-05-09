import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Look up the Neural Draft workspaces (tenants) registered against an
 * email address. Useful when an AI is helping a user troubleshoot
 * multi-workspace login on the central admin host.
 *
 * Calls `GET <central>/central/api/tenants-for-email?email=...` — the
 * endpoint lives on the CENTRAL host (e.g. https://app.neuraldraft.io),
 * NOT the per-tenant API. The client derives the central host from the
 * configured API URL; pass `central_url` to override.
 *
 * Always returns 200 (empty list for unknown emails) — defeats email
 * enumeration. Free; doesn't consume credits.
 */
export function registerFindWorkspacesTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "find_workspaces",
    {
      title: "Find workspaces for an email",
      description: [
        "List the Neural Draft workspaces (tenants) an email is registered against.",
        "Useful for multi-workspace login troubleshooting — the user knows the email but forgot which workspace.",
        "Hits the CENTRAL host (e.g. https://app.neuraldraft.io), not the per-tenant API.",
        "Always 200, even for unknown emails (anti-enumeration). Free; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        email: z.string().email().describe("Email address to look up."),
        central_url: z
          .string()
          .url()
          .optional()
          .describe(
            "Override the central host (default derived from NEURALDRAFT_API_URL by replacing the first hostname label with 'app').",
          ),
      },
    },
    async ({ email, central_url }): Promise<CallToolResult> => {
      try {
        const result = await ctx.client.findWorkspaces(email, central_url);
        const lines = result.workspaces.map(
          (w) => `- #${w.id} — "${w.name}" — ${w.domain}`,
        );
        return {
          content: [
            {
              type: "text",
              text:
                lines.length === 0
                  ? `No workspaces found for ${email}.`
                  : `${lines.length} workspace(s) for ${email}:\n${lines.join("\n")}`,
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
