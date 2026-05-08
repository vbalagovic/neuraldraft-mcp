import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * /scaffold-blog-page — drop a blog index + slug page into an existing project,
 * wired to read posts from Neural Draft.
 */
export function registerScaffoldBlogPagePrompt(server: McpServer): void {
  server.registerPrompt(
    "scaffold_blog_page",
    {
      title: "Scaffold a blog index + post page on Neural Draft",
      description:
        "Generates /blog and /blog/[slug] for the chosen framework, fetching posts from Neural Draft.",
      argsSchema: {
        framework: z
          .enum(["next", "astro", "sveltekit", "nuxt", "remix", "vite-react"])
          .describe("Frontend framework / generator."),
        language: z
          .string()
          .optional()
          .describe("Default BCP-47 language code, e.g. 'en'. Defaults to project default."),
      },
    },
    ({ framework, language }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `Scaffold a blog for a ${framework} project, using Neural Draft as the backend.`,
              "",
              "Steps to follow exactly:",
              "1. Read the resource `brand://current` and apply the project's colors / fonts / voice.",
              "2. Read the resource `schema://blog-post` so the field names match the API exactly.",
              "3. Read the resource `conventions://api-usage` for auth headers, error shape, rate limits.",
              "4. Create a small Neural Draft client at `lib/neuraldraft.ts` (or framework-equivalent) reading `process.env.NEURALDRAFT_API_KEY`.",
              "5. Generate `/blog` (index): list posts via `GET /v1/blog-posts?lang=" +
                (language ?? "{{ projectDefaultLang }}") +
                "&page=1&page_size=20`.",
              "6. Generate `/blog/[slug]`: fetch post via `GET /v1/blog-posts/{slug}?lang=...` with proper 404 handling.",
              "7. Render `featured_image.url`, `published_at`, `category.name`, tags. Sanitise the HTML body when rendering (the API already returns sanitised HTML — render with `dangerouslySetInnerHTML` / `{@html ...}` as appropriate).",
              "8. Add loading states (skeleton) and an error boundary.",
              "9. For SEO: emit `<title>` from `seo.meta_title || title`, meta description from `seo.meta_description || excerpt`, OG image from `seo.og_image || featured_image.url`.",
              "10. After every section you generate, call `register_component` with the markup (intent: 'blog_index_card', 'blog_post_meta_block', etc.) so the section appears as editable in the project admin.",
              "",
              "Output: a brief plan, then the file tree, then each file in its own ```code``` block. Mention the `editor_url` printed back from each `register_component` call.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
