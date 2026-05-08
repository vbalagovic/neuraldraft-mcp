import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Premium video generation (Kling v2.1 / Runway Gen4).
 *
 * Returns a Job — call `get_job` with the returned id until status='completed'.
 * Charges 100 credits. The API returns 402 if the project doesn't have enough.
 */
export function registerGenerateVideoTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "generate_video",
    {
      title: "Generate a brand-aware video clip",
      description: [
        "Kick off a premium video generation (Kling v2.1 / Runway Gen4) and return a Job.",
        "Costs 100 credits per call. Poll with get_job until status='completed'.",
        "Aspect ratios optimised for short-form social: 9:16 (Reels/TikTok), 16:9 (YouTube), 1:1 (feed).",
      ].join(" "),
      inputSchema: {
        prompt: z
          .string()
          .min(3)
          .max(2000)
          .describe(
            "What the video should show. Be visual: action verbs, camera movement, mood. e.g. 'cinematic top-down shot of pour-over coffee, slow motion, warm morning light'.",
          ),
        aspect_ratio: z
          .enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"])
          .optional()
          .describe("Default 9:16 (vertical for Reels/TikTok)."),
        duration_seconds: z
          .number()
          .int()
          .min(3)
          .max(30)
          .optional()
          .describe("Clip length. Default 5. Longer clips may use multiple model calls."),
        visual_style: z
          .string()
          .optional()
          .describe("Style note, e.g. 'cinematic_realistic', 'anime', 'product_studio'."),
        platforms: z
          .array(z.enum(["facebook", "instagram", "twitter", "tiktok", "linkedin"]))
          .optional()
          .describe("Target platforms — affects formatting / pacing. Default ['tiktok','instagram']."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const job = await ctx.client.generateVideo(input);
        const out = {
          job_id: job.id,
          status: job.status,
          message: `Video generation queued. Poll get_job with id=${job.id} to track progress.`,
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
