import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { mapApiError } from "../errors.js";

/**
 * Create a BookableService — apartment-style (date_range) or
 * meeting-style (time_slot). After creation, use `setup_booking_widget`
 * to embed the service.
 *
 * Free; doesn't consume credits.
 */
export function registerCreateBookableServiceTool(
  server: McpServer,
  ctx: ServerContext,
): void {
  server.registerTool(
    "create_bookable_service",
    {
      title: "Create a bookable service",
      description: [
        "Create a service that customers can book.",
        "Two modes:",
        " • booking_type='time_slot' (default) — meeting / appointment style with fixed duration_minutes (e.g. 30, 60).",
        " • booking_type='date_range' — apartment / rental style with min_nights / max_nights.",
        "Free; embedding is via setup_booking_widget.",
      ].join("\n"),
      inputSchema: {
        name: z.string().min(1).max(255).describe("Customer-facing name. e.g. 'Cozy beach apartment' or '30-min consultation'."),
        slug: z
          .string()
          .optional()
          .describe("URL slug; auto-generated from name if omitted."),
        description: z.string().optional().describe("Long description (markdown OK)."),
        short_description: z.string().max(500).optional(),
        price: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Price in minor units (cents/pence). 0 = free. Default 0."),
        currency: z
          .string()
          .length(3)
          .optional()
          .describe("ISO-4217 currency code, lowercase. Default 'gbp'."),
        booking_type: z
          .enum(["time_slot", "date_range"])
          .optional()
          .describe(
            "'time_slot' for meetings/appointments (default), 'date_range' for apartment/rental stays.",
          ),
        // time_slot fields
        duration_minutes: z
          .number()
          .int()
          .min(1)
          .max(1440)
          .optional()
          .describe("[time_slot] Slot length in minutes. Default 60."),
        buffer_before_minutes: z.number().int().min(0).max(1440).optional(),
        buffer_after_minutes: z.number().int().min(0).max(1440).optional(),
        max_bookings_per_slot: z.number().int().min(1).max(1000).optional(),
        // date_range fields
        min_nights: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe("[date_range] Minimum stay in nights. Default 1."),
        max_nights: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe("[date_range] Maximum stay in nights. Default 30."),
        // shared
        min_notice_hours: z
          .number()
          .int()
          .min(0)
          .max(8760)
          .optional()
          .describe("Minimum hours-ahead for new bookings."),
        max_advance_days: z
          .number()
          .int()
          .min(0)
          .max(3650)
          .optional()
          .describe("How far ahead bookings are allowed."),
        cancellation_hours: z
          .number()
          .int()
          .min(0)
          .max(8760)
          .optional()
          .describe("Customer cancellation window in hours."),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional()
          .describe("Hex color used in the calendar UI."),
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const service = await ctx.client.createBookableService(input);
        const mode = service.booking_type === "date_range" ? "apartment-style" : "meeting-style";
        return {
          content: [
            {
              type: "text",
              text: [
                `Bookable service created: id=${service.id}, slug=${service.slug} (${mode}).`,
                `Embed with: setup_booking_widget service_id=${service.id}`,
              ].join("\n"),
            },
          ],
          structuredContent: service as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return mapApiError(err);
      }
    },
  );
}
