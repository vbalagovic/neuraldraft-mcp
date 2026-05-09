import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Replace the image at `key` either by providing a new URL (synchronous,
 * 0 credits) or by regenerating with AI (async, ~40 credits). Multipart
 * file upload is intentionally not exposed via MCP — use the SDK or REST
 * directly when you need to push raw bytes.
 */
export function registerReplaceImageTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "replace_image",
    {
      title: "Replace a registered image",
      description: [
        "Replace the image at `key` either by:",
        "  - `url`: synchronous URL swap (0 credits), or",
        "  - `regenerate: true` + `prompt`: AI regeneration (~40 credits, returns a Job — poll get_job).",
        "Exactly one mode must be supplied.",
      ].join(" "),
      inputSchema: {
        key: z
          .string()
          .min(1)
          .regex(/^[\w.\-\/]+$/, "Key must match ^[\\w.\\-\\/]+$")
          .describe("Image key to replace, e.g. 'hero.background'."),
        url: z
          .string()
          .url()
          .max(2000)
          .optional()
          .describe("New direct URL. Mutually exclusive with regenerate."),
        regenerate: z
          .boolean()
          .optional()
          .describe("If true, regenerate the image with AI; requires `prompt`."),
        prompt: z
          .string()
          .min(3)
          .optional()
          .describe("Subject / scene description for AI regeneration."),
        aspect_ratio: z
          .enum(["1:1", "4:3", "16:9", "9:16", "3:4", "21:9"])
          .optional()
          .describe("Aspect ratio for AI regeneration. Defaults to 16:9."),
        style: z
          .string()
          .optional()
          .describe("Visual style for AI regeneration, e.g. 'photorealistic'."),
      },
    },
    async (input): Promise<CallToolResult> => {
      const hasUrl = typeof input.url === "string" && input.url.length > 0;
      const hasRegenerate = input.regenerate === true;

      if (!hasUrl && !hasRegenerate) {
        return {
          content: [
            {
              type: "text",
              text: "Provide either `url` (direct swap) or `regenerate: true` with a `prompt` (AI).",
            },
          ],
          isError: true,
        };
      }

      if (hasUrl && hasRegenerate) {
        return {
          content: [
            {
              type: "text",
              text: "`url` and `regenerate` are mutually exclusive — pick one.",
            },
          ],
          isError: true,
        };
      }

      try {
        if (hasUrl) {
          const img = await ctx.client.registerImage(input.key, input.url!);
          return {
            content: [
              {
                type: "text",
                text: `Replaced ${img.key} → ${img.url}`,
              },
            ],
            structuredContent: img as unknown as Record<string, unknown>,
          };
        }

        if (!input.prompt) {
          return {
            content: [
              { type: "text", text: "`prompt` is required when `regenerate` is true." },
            ],
            isError: true,
          };
        }

        const job = await ctx.client.regenerateImage(input.key, {
          prompt: input.prompt,
          aspect_ratio: input.aspect_ratio,
          style: input.style,
        });
        return {
          content: [
            {
              type: "text",
              text: `Image regeneration queued for "${input.key}". Poll get_job with id=${job.id}; the new URL will be at result.url.`,
            },
          ],
          structuredContent: { job_id: job.id, status: job.status },
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
