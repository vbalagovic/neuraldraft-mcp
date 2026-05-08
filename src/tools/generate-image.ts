import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Generate a brand-consistent image. Returns a Job; poll get_job for the
 * resolved CDN URL. Costs ~40 credits per image.
 */
export function registerGenerateImageTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "generate_image",
    {
      title: "Generate a brand-consistent image",
      description: [
        "Generate a brand-consistent image (uses the project's color palette and visual tone automatically).",
        "Returns a Job ID; poll with get_job until status is 'completed'.",
        "Pass `key` to make the image addressable later via GET /v1/images/{key} (recommended).",
        "Costs ~40 credits per image.",
      ].join(" "),
      inputSchema: {
        prompt: z
          .string()
          .min(3)
          .describe("Subject / scene description, e.g. 'Serene yoga studio at dawn, soft sage tones, no people'."),
        aspect_ratio: z
          .enum(["1:1", "4:3", "16:9", "9:16", "3:4", "21:9"])
          .optional()
          .describe("Aspect ratio. Defaults to 16:9."),
        style: z
          .string()
          .optional()
          .describe("Visual style, e.g. 'photorealistic', 'editorial_illustration', 'minimal_geometric'."),
        key: z
          .string()
          .optional()
          .describe("Stable key to bind the result to (e.g. 'hero.background'); future calls can fetch by key."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const job = await ctx.client.generateImage(input);
        const out = {
          job_id: job.id,
          status: job.status,
          message: `Image generation queued. Use get_job with id=${job.id}; final URL will be in result.url.`,
        };
        return {
          content: [{ type: "text", text: out.message }],
          structuredContent: out,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
