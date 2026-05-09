import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Read the project's brand context: industry, audience, voice, colors,
 * fonts, logo, and the free-tier branding badge flag.
 *
 * Most callers should read the `brand://current` resource instead — it's
 * cheaper (cached, no protocol round-trip). This tool exists for clients
 * that don't surface MCP resources and for the in-admin AI assistant.
 *
 * Read-only; 0 credits.
 */
export function registerGetBrandTool(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "get_brand",
    {
      title: "Get brand context",
      description: [
        "Read the project's brand: voice, audience, content tone, colors, fonts, logo, target topics.",
        "Identical to the `brand://current` resource but exposed as a tool for clients that don't list resources.",
        "Read-only; doesn't consume credits.",
      ].join(" "),
      inputSchema: {},
    },
    async (): Promise<CallToolResult> => {
      try {
        const brand = await ctx.client.getBrand();
        const lines = [
          brand.description ? `description: ${brand.description}` : null,
          brand.voice ? `voice: ${brand.voice}` : null,
          brand.audience ? `audience: ${brand.audience}` : null,
          brand.content_tone ? `tone: ${brand.content_tone}` : null,
          brand.industry ? `industry: ${brand.industry}` : null,
          brand.colors?.primary?.hex
            ? `primary: ${brand.colors.primary.hex}` +
              (brand.colors.secondary?.hex ? ` / secondary: ${brand.colors.secondary.hex}` : "") +
              (brand.colors.accent?.hex ? ` / accent: ${brand.colors.accent.hex}` : "")
            : null,
          brand.fonts?.heading || brand.fonts?.body
            ? `fonts: ${brand.fonts.heading ?? "—"} / ${brand.fonts.body ?? "—"}`
            : null,
          brand.requires_branding_badge
            ? "requires_branding_badge: TRUE — paste branding_badge_html into every footer."
            : null,
        ].filter(Boolean);
        return {
          content: [
            {
              type: "text",
              text:
                lines.length === 0
                  ? "Brand context is empty. Use update_brand to populate voice/audience/colors before generating UI."
                  : lines.join("\n"),
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
