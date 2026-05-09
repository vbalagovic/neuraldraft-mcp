import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Read a single translation key. Returns the resolved value for `lang`
 * (or the project default) plus the full all_locales map.
 *
 * Read-only; 0 credits.
 */
export function registerGetContentTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "get_content",
    {
      title: "Get a translation key",
      description: [
        "Fetch a single translation key by name (returns the value for the chosen language plus every other locale that has been written).",
        "Use `lang` to pick the locale; defaults to the project default language.",
        "Read-only; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        key: z
          .string()
          .min(1)
          .describe("Dot-namespaced translation key, e.g. 'hero.headline'."),
        lang: z
          .string()
          .max(10)
          .optional()
          .describe("BCP-47 language code (defaults to project default_language)."),
      },
    },
    async ({ key, lang }): Promise<CallToolResult> => {
      try {
        const result = await ctx.client.getContent(key, { lang });
        return {
          content: [
            {
              type: "text",
              text: `${result.key}: "${result.value ?? ""}"`,
            },
          ],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
