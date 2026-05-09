import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Current credit balance, monthly limit, and per-operation spend breakdown
 * for the running billing period.
 *
 * Use before kicking off expensive jobs (blog gen ~400 cr, premium video
 * 300 cr) to confirm budget.
 *
 * Read-only; 0 credits.
 */
export function registerGetUsageTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "get_usage",
    {
      title: "Get current credit usage",
      description: [
        "Read the project's current credit balance, monthly limit, reset date, and per-operation spend breakdown for this billing period.",
        "Use this to decide whether a multi-step generation will fit the budget before kicking it off.",
        "Read-only; doesn't consume credits.",
      ].join(" "),
      inputSchema: {},
    },
    async (): Promise<CallToolResult> => {
      try {
        const usage = await ctx.client.getUsage();
        const breakdown = (usage.breakdown ?? [])
          .map((b) => `  - ${b.operation_type}: ${b.total_spent} (×${b.count})`)
          .join("\n");
        const lines = [
          `Balance: ${usage.credits_balance} / ${usage.credits_monthly_limit} credits`,
          `Period: ${usage.period_start.slice(0, 10)} → ${usage.period_end.slice(0, 10)}`,
          usage.credits_reset_at
            ? `Resets: ${usage.credits_reset_at.slice(0, 10)}`
            : null,
          `Spent this period: ${usage.total_spent_this_period}`,
          breakdown ? `Breakdown:\n${breakdown}` : null,
        ].filter(Boolean);
        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: usage as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
