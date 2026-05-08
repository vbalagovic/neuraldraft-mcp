import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * /connect-existing-site — walk a developer through making their existing
 * static site editable through Neural Draft.
 */
export function registerConnectExistingSitePrompt(server: McpServer): void {
  server.registerPrompt(
    "connect_existing_site",
    {
      title: "Connect an existing site to Neural Draft",
      description:
        "Migrate a static or hand-coded site to read content from Neural Draft, so the customer can edit it without touching code.",
      argsSchema: {
        framework: z
          .enum([
            "next",
            "astro",
            "sveltekit",
            "nuxt",
            "remix",
            "vite-react",
            "html",
            "other",
          ])
          .describe("Framework / generator the site is built with."),
        site_path: z
          .string()
          .optional()
          .describe("Repo-relative path to the site root, if not the project root."),
      },
    },
    ({ framework, site_path }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `Connect this existing ${framework} site to Neural Draft for editability.`,
              site_path ? `Site root: ${site_path}` : "Site root: project root.",
              "",
              "Plan and execute in this order:",
              "1. Audit the site: list every page; for each, list every static text string and every static image.",
              "2. Read `brand://current` to confirm the project context matches this site (colors, voice).",
              "3. Read `conventions://editable-html` for the data-translate / data-image-key spec.",
              "4. Propose a key namespace (e.g. each page gets its own prefix: `home.*`, `about.*`).",
              "5. For each page, replace static strings with `data-translate=\"<key>\"` markers, and bind images via `data-image-key=\"<key>\"`.",
              "6. Add a Neural Draft client (`lib/neuraldraft.ts` or equivalent) and a build-time fetch that hydrates each key via `GET /v1/content/bulk?keys=...&lang=...`.",
              "7. Call `create_translation_keys` once with the full key→default-text map for all keys you introduced (so the keys exist in admin even before any content edit).",
              "8. Call `register_component` for each editable section so it appears in the customer's admin grouped by intent.",
              "9. Generate a short `EDITING.md` for the customer that explains: 'click these editor URLs to change copy / images / colors'.",
              "",
              "Output: per-page diffs, the `lib/neuraldraft.ts` module, the list of registered components with their editor URLs, and the `EDITING.md`.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
