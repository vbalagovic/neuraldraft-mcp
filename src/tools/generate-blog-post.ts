import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Trigger an AI blog post generation. Returns a Job — call `get_job` to
 * poll for completion. (Each generation costs ~400 credits; the user must
 * have credits available or the API returns 402.)
 */
export function registerGenerateBlogPostTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "generate_blog_post",
    {
      title: "Generate a blog post",
      description: [
        "Kick off the AI blog generation pipeline (research → draft → image → SEO).",
        "Returns a Job ID immediately; poll with the get_job tool until status is 'completed'.",
        "Costs ~400 credits per post (more if translate_to is set).",
      ].join(" "),
      inputSchema: {
        topic: z
          .string()
          .min(3)
          .describe("Topic / angle for the post, e.g. '5-minute breathwork for anxious mornings'."),
        style: z
          .string()
          .optional()
          .describe("Tone / style override, e.g. 'friendly_professional', 'playful', 'authoritative'. Defaults to brand voice."),
        word_count: z
          .number()
          .int()
          .min(200)
          .max(5000)
          .optional()
          .describe("Approximate word count target. Defaults to ~1200."),
        target_audience: z
          .string()
          .optional()
          .describe("Audience override. Defaults to brand audience."),
        primary_keyword: z.string().optional().describe("SEO primary keyword."),
        secondary_keywords: z
          .array(z.string())
          .optional()
          .describe("SEO secondary keywords."),
        translate_to: z
          .array(z.string())
          .optional()
          .describe("BCP-47 language codes to also translate the post into, e.g. ['de', 'fr', 'es']."),
        enable_research: z
          .boolean()
          .optional()
          .describe("Enable web research before drafting. Defaults to true; costs slightly more."),
        image_style: z
          .string()
          .optional()
          .describe("Featured image style (e.g. 'warm_lifestyle_photo'). Defaults to brand image style."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const job = await ctx.client.generateBlogPost(input);
        const out = {
          job_id: job.id,
          status: job.status,
          message: `Blog post generation queued. Use get_job with id=${job.id} to track progress.`,
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
