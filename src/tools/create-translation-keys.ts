import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Bulk-create translation keys for a project before the AI tool emits markup
 * that references them.
 *
 * Most users won't call this directly — `register_component` extracts keys
 * automatically. Use this for keys you intend to reference from code that
 * doesn't pass through component registration (e.g. error messages,
 * navigation labels declared in a config file).
 */
export function registerCreateTranslationKeysTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "create_translation_keys",
    {
      title: "Bulk-create translation keys",
      description: [
        "Create multiple translation keys with default values in one call.",
        "Use this for keys you reference outside of registered components (nav labels, error strings, etc.).",
        "Returns lists of newly-created and already-existing keys.",
      ].join(" "),
      inputSchema: {
        keys: z
          .record(z.string().min(1), z.string())
          .describe(
            "Map of key → default value. Keys are dot.namespaced. Example: {'nav.home': 'Home', 'nav.about': 'About'}",
          ),
        language: z
          .string()
          .optional()
          .describe("BCP-47 language code for the default values. Defaults to 'en'."),
      },
    },
    async ({ keys, language }): Promise<CallToolResult> => {
      try {
        const result = await ctx.client.createTranslationKeys(keys, language ?? "en");
        return {
          content: [
            {
              type: "text",
              text: [
                `Created ${result.created.length} new key(s).`,
                result.skipped_existing.length > 0
                  ? `Skipped ${result.skipped_existing.length} key(s) that already existed.`
                  : null,
              ]
                .filter(Boolean)
                .join(" "),
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
