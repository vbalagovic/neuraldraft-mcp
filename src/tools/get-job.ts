import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Get the current status of an async job kicked off by a previous tool call
 * (generate_blog_post, generate_image, etc.).
 *
 * Read-only, no credits consumed.
 */
export function registerGetJobTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "get_job",
    {
      title: "Get a job status",
      description:
        "Poll the status of an async Neural Draft job (returned by generate_blog_post, generate_image, etc.). Status flows pending → running → completed | failed | cancelled.",
      inputSchema: {
        id: z.string().min(1).describe("Job ID, e.g. 'job_2Ngd9KqLmRpW'."),
      },
    },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const job = await ctx.client.getJob(id);
        return {
          content: [
            {
              type: "text",
              text: [
                `Job ${job.id} (${job.type}) — status: ${job.status}` +
                  (typeof job.progress === "number" ? `, progress: ${job.progress}%` : ""),
                job.status === "completed" && job.result
                  ? `Result: ${JSON.stringify(job.result)}`
                  : null,
                job.status === "failed" && job.error
                  ? `Error: ${job.error.code} — ${job.error.message}`
                  : null,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
          structuredContent: job as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
