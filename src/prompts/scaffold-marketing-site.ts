import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * /scaffold-marketing-site — opinionated full marketing site (hero / features /
 * testimonials / pricing / CTA / footer) wired through Neural Draft.
 */
export function registerScaffoldMarketingSitePrompt(server: McpServer): void {
  server.registerPrompt(
    "scaffold_marketing_site",
    {
      title: "Scaffold a marketing site on Neural Draft",
      description:
        "Generate a complete marketing site whose copy, images, and design tokens live in Neural Draft.",
      argsSchema: {
        framework: z
          .enum(["next", "astro", "sveltekit", "nuxt", "remix", "vite-react"])
          .describe("Frontend framework."),
        sections: z
          .string()
          .optional()
          .describe(
            "Comma-separated section list, e.g. 'hero,features,testimonials,pricing,cta,footer'. Defaults to a full marketing site.",
          ),
        languages: z
          .string()
          .optional()
          .describe("Comma-separated BCP-47 codes the site should support, e.g. 'en,de,fr'."),
      },
    },
    ({ framework, sections, languages }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `Scaffold a complete marketing site using ${framework}, with content managed by Neural Draft.`,
              "",
              `Sections: ${sections ?? "hero, features, testimonials, pricing, cta, footer"}.`,
              `Languages: ${languages ?? "(project default only)"}.`,
              "",
              "Required steps (in order):",
              "1. Read `brand://current` — apply primary/secondary colors, heading + body fonts, and voice to all generated copy.",
              "2. Read `conventions://editable-html` — every text node MUST have `data-translate` and every image MUST have `data-image-key`.",
              "3. Read `conventions://api-usage` — auth headers, error handling, rate limits.",
              "4. Generate the layout shell (root layout file with theme variables from brand colors).",
              "5. For EACH section, after generating the markup, call `register_component` with the HTML, an `intent` (e.g. 'marketing_hero'), and `page_slug: 'home'`. Echo the returned `editor_url` in a comment above the section so the dev knows where to edit it.",
              "6. If image placeholders are needed, call `generate_image` with a prompt + a stable `key` and use `<img data-image-key=\"...\" src=\"...\">` referencing the key.",
              "7. Wire content fetching: build-time fetch via `GET /v1/content/bulk?keys=...&lang=...`. Show a working example in a `lib/neuraldraft.ts` (or framework equivalent) module.",
              "8. Add a basic SEO setup using brand metadata.",
              "",
              "Output: file tree first, then each file in its own ```code``` block, then a checklist of editor_urls the user can click to edit each section.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
