import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Patch an existing blog post — fix a typo in the body, swap a featured
 * image, tighten an SEO meta_description, or change the publish status.
 *
 * Text fields (title, content, excerpt, meta_title, meta_description)
 * write to the matching `PostTranslation` row resolved by `language_code`
 * (default `'en'`). Post-level fields (slug, status, category_id,
 * featured_image, tags) write to the post itself.
 */
export function registerUpdateBlogPostTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "update_blog_post",
    {
      title: "Update a blog post",
      description: [
        "Patch a blog post's title / body / SEO meta / status.",
        "Use `language_code` to pick which translation the text fields write to.",
        "Free; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        id: z
          .number()
          .int()
          .positive()
          .describe("Numeric post id (use list_blog_posts or get_blog_post to find it)."),
        title: z.string().max(500).optional(),
        content: z.string().optional().describe("HTML body."),
        excerpt: z.string().max(1000).optional(),
        meta_title: z.string().max(255).optional(),
        meta_description: z.string().max(500).optional(),
        slug: z.string().max(255).optional(),
        category_id: z.number().int().positive().optional(),
        featured_image: z
          .string()
          .url()
          .max(2000)
          .optional()
          .describe("Absolute URL of the featured / og:image."),
        status: z.enum(["draft", "published", "scheduled"]).optional(),
        language_code: z
          .string()
          .min(2)
          .max(10)
          .optional()
          .describe("Which translation the text fields write to. Default 'en'."),
        tags: z
          .array(z.number().int().positive())
          .optional()
          .describe("Tag IDs to attach (sync without detach)."),
      },
    },
    async ({ id, ...rest }): Promise<CallToolResult> => {
      try {
        const post = await ctx.client.updateBlogPost(id, rest);
        return {
          content: [
            {
              type: "text",
              text: `Blog post updated: id=${post.id}, slug=/${post.slug}, status=${post.status}.`,
            },
          ],
          structuredContent: post as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
