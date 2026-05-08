import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Register a generated HTML section as an editable component in the project admin.
 *
 * Call once per section (hero, features, pricing, footer…). Neural Draft
 * parses the HTML, extracts every `data-translate` attribute, creates the
 * matching translation keys, and exposes the section as editable in the
 * customer's admin.
 */
export function registerRegisterComponentTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "register_component",
    {
      title: "Register a generated component",
      description: [
        "Register an HTML section as an editable component in the customer's Neural Draft admin.",
        "Call this for EVERY section you generate (hero, features, pricing, footer, etc.).",
        "The HTML should follow the editable-HTML conventions (read conventions://editable-html first).",
        "Returns the component_id (preserve in code as a comment) and the translation keys that were created.",
      ].join(" "),
      inputSchema: {
        html: z
          .string()
          .min(1)
          .describe("Full HTML for the section, including data-translate / data-image-key attributes."),
        intent: z
          .string()
          .min(1)
          .describe(
            "What this section is for, e.g. 'marketing_hero', 'pricing_grid', 'testimonials'. Free-form but lowercase_snake_case is recommended.",
          ),
        page_slug: z
          .string()
          .optional()
          .describe("Slug of the page this section belongs to (e.g. 'home', 'about', 'pricing')."),
      },
    },
    async ({ html, intent, page_slug }): Promise<CallToolResult> => {
      try {
        const r = await ctx.client.registerComponent({ html, intent, page_slug });
        const out = {
          component_id: r.id,
          translation_keys: r.keys_created ?? [],
          image_keys: r.image_keys ?? [],
          editor_url: r.editor_url ?? null,
        };
        return {
          content: [
            {
              type: "text",
              text: [
                `Component registered: ${out.component_id}`,
                `Translation keys: ${out.translation_keys.join(", ") || "(none)"}`,
                out.editor_url ? `Edit in admin: ${out.editor_url}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
          structuredContent: out,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
