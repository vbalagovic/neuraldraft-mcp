import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Trigger an AI blog post generation. Returns a Job — call `get_job` to
 * poll for completion. (Each generation costs ~400 credits; the user must
 * have credits available or the API returns 402.)
 *
 * Schema mirrors BlogController::storeAi exactly.
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
        "Costs ~400 credits per post. Set translate_to_all=true to fan out into every project target language (5 credits per extra language).",
      ].join(" "),
      inputSchema: {
        topic: z
          .string()
          .min(3)
          .max(500)
          .describe("Topic / angle for the post, e.g. '5-minute breathwork for anxious mornings'."),
        style: z
          .enum([
            "professional",
            "casual",
            "educational",
            "thought_leadership",
            "storytelling",
          ])
          .optional()
          .describe("Tone / style. Defaults to brand voice."),
        word_count: z
          .number()
          .int()
          .min(300)
          .max(5000)
          .optional()
          .describe("Approximate word count target. Defaults to ~1200."),
        target_audience: z
          .string()
          .max(500)
          .optional()
          .describe("Audience override. Defaults to brand audience."),
        primary_keyword: z
          .string()
          .max(200)
          .optional()
          .describe("SEO primary keyword."),
        secondary_keywords: z
          .array(z.string())
          .optional()
          .describe("SEO secondary keywords."),
        image_style: z
          .enum(["photo", "illustration", "abstract"])
          .optional()
          .describe("Featured image style. Defaults to 'photo'."),
        translate_to_all: z
          .boolean()
          .optional()
          .describe(
            "When true, fans the post out into every project target language after the source draft is written. " +
              "For per-language control use translate_blog_post on the resulting post id.",
          ),
        enable_research: z
          .boolean()
          .optional()
          .describe("Enable web research before drafting. Defaults to true."),
        research_depth: z
          .enum(["light", "standard", "deep"])
          .optional()
          .describe("Research depth. Defaults to 'standard'."),
        additional_instructions: z
          .string()
          .max(2000)
          .optional()
          .describe("Free-form steering passed verbatim into the drafting prompt."),
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
