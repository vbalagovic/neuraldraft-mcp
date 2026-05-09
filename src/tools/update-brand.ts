import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Patch the project's brand context.
 *
 * Mirrors PATCH /v1/brand. Every field is `sometimes nullable` — pass only
 * what you want to change; everything else is left alone.
 */
export function registerUpdateBrandTool(server: McpServer, ctx: ServerContext): void {
  const HexColor = z.object({
    hex: z
      .string()
      .regex(/^#[0-9A-Fa-f]{3,8}$/, "Hex must be #RGB / #RRGGBB / #RRGGBBAA")
      .nullable()
      .optional(),
    name: z.string().max(100).nullable().optional(),
  });

  server.registerTool(
    "update_brand",
    {
      title: "Update brand context",
      description: [
        "Patch the project's brand: voice, audience, tone, colors, fonts, logo, languages.",
        "Only the fields you pass are updated; others are preserved (merge semantics).",
        "Free; doesn't consume credits.",
      ].join(" "),
      inputSchema: {
        voice: z.string().max(1000).nullable().optional(),
        audience: z.string().max(500).nullable().optional(),
        content_tone: z.string().max(100).nullable().optional(),
        content_goals: z.array(z.string().max(100)).nullable().optional(),
        preferred_topics: z.array(z.string().max(100)).nullable().optional(),
        description: z
          .string()
          .max(2000)
          .nullable()
          .optional()
          .describe("Reads from / writes to TenantHomepage.company_name."),
        logo_url: z.string().url().max(512).nullable().optional(),
        colors: z
          .object({
            primary: HexColor.nullable().optional(),
            secondary: HexColor.nullable().optional(),
            accent: HexColor.nullable().optional(),
          })
          .nullable()
          .optional(),
        fonts: z
          .object({
            heading: z.string().max(100).nullable().optional(),
            body: z.string().max(100).nullable().optional(),
          })
          .nullable()
          .optional(),
        target_languages: z.array(z.string().max(10)).nullable().optional(),
        default_language: z.string().max(10).nullable().optional(),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const brand = await ctx.client.updateBrand(input);
        return {
          content: [
            {
              type: "text",
              text: "Brand updated.",
            },
          ],
          structuredContent: brand as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
