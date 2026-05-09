import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Fetch a single blog post by id or slug. Returns the locale-resolved
 * title, excerpt, content and SEO meta so the AI can review or update it
 * without an extra round-trip.
 */
export function registerGetBlogPostTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "get_blog_post",
    {
      title: "Get a blog post",
      description: [
        "Fetch a blog post (title, body, excerpt, SEO meta, translations) by id or slug.",
        "Use `lang` to pick a non-default translation. Read-only; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        id_or_slug: z
          .union([z.string().min(1), z.number().int().positive()])
          .describe("Numeric post id or string slug (e.g. '5-minute-breathwork-for-anxious-mornings')."),
        lang: z
          .string()
          .min(2)
          .max(10)
          .optional()
          .describe(
            "BCP-47 language code (e.g. 'en', 'de', 'es'). Defaults to the project's default language.",
          ),
      },
    },
    async ({ id_or_slug, lang }): Promise<CallToolResult> => {
      try {
        const post = await ctx.client.getBlogPost(id_or_slug, { lang });
        const lines = [
          `**${post.title}** — /${post.slug} (id: ${post.id}, status: ${post.status})`,
          `- meta_title: ${post.meta_title ?? "—"}`,
          `- meta_description: ${post.meta_description ?? "—"}`,
          `- featured_image: ${post.featured_image ?? "—"}`,
          `- published_at: ${post.published_at ?? "—"}`,
          `- translations: ${(post.translations ?? []).map((t) => t.lang).join(", ") || "—"}`,
        ];
        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: post as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
