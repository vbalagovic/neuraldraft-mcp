import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Static schema resources. The shape published here matches the v1 API
 * responses (subset — fields the AI tool actually needs to render). Keeping
 * them inline (no I/O) makes the resources cheap and deterministic.
 *
 * AI tools read these so generated `/blog`, `/products`, `/booking` pages
 * use the right field names.
 */

const BLOG_POST_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "BlogPost",
  description:
    "Shape returned by GET /v1/blog-posts/{id_or_slug} and the array items of GET /v1/blog-posts.",
  type: "object",
  properties: {
    id: { type: "integer" },
    slug: { type: "string" },
    title: { type: "string" },
    excerpt: { type: "string" },
    content: { type: "string", description: "Sanitised HTML body." },
    language_code: { type: "string", description: "BCP-47 code, e.g. en, en-GB, de." },
    status: { type: "string", enum: ["draft", "scheduled", "published", "archived"] },
    published_at: { type: ["string", "null"], format: "date-time" },
    featured_image: {
      type: ["object", "null"],
      properties: {
        url: { type: "string", format: "uri" },
        alt: { type: "string" },
      },
    },
    category: {
      type: ["object", "null"],
      properties: { id: { type: "integer" }, name: { type: "string" }, slug: { type: "string" } },
    },
    tags: { type: "array", items: { type: "string" } },
    author: {
      type: ["object", "null"],
      properties: { name: { type: "string" }, avatar_url: { type: "string" } },
    },
    seo: {
      type: ["object", "null"],
      properties: {
        meta_title: { type: "string" },
        meta_description: { type: "string" },
        og_image: { type: "string", format: "uri" },
      },
    },
    translations: {
      type: "array",
      description: "Other available language codes for this post.",
      items: { type: "string" },
    },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
  },
  required: ["id", "slug", "title", "language_code", "status"],
} as const;

const PRODUCT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Product",
  description: "Shape returned by GET /v1/products/{id} and items of GET /v1/products.",
  type: "object",
  properties: {
    id: { type: ["string", "integer"] },
    name: { type: "string" },
    slug: { type: "string" },
    description: { type: ["string", "null"] },
    price_cents: { type: "integer", minimum: 0 },
    currency: { type: "string", description: "ISO 4217, e.g. USD, GBP, EUR." },
    status: { type: "string", enum: ["draft", "active", "archived"] },
    inventory: { type: ["integer", "null"] },
    images: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string", format: "uri" },
          alt: { type: "string" },
        },
      },
    },
    variants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: ["string", "integer"] },
          name: { type: "string" },
          price_cents: { type: "integer" },
          inventory: { type: "integer" },
        },
      },
    },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
  },
  required: ["id", "name", "price_cents", "currency", "status"],
} as const;

const BOOKING_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "BookableService + Booking",
  description:
    "Composite schema for booking-related resources. Use the `service` shape for /bookable-services responses; `booking` for /bookings; `slot` for /availability.",
  type: "object",
  properties: {
    service: {
      type: "object",
      properties: {
        id: { type: ["string", "integer"] },
        name: { type: "string" },
        description: { type: ["string", "null"] },
        duration_minutes: { type: "integer", minimum: 1 },
        price_cents: { type: ["integer", "null"] },
        currency: { type: "string" },
        active: { type: "boolean" },
      },
      required: ["id", "name", "duration_minutes"],
    },
    slot: {
      type: "object",
      properties: {
        starts_at: { type: "string", format: "date-time" },
        ends_at: { type: "string", format: "date-time" },
        staff_id: { type: ["string", "integer", "null"] },
      },
      required: ["starts_at", "ends_at"],
    },
    booking: {
      type: "object",
      properties: {
        id: { type: ["string", "integer"] },
        ref: { type: "string" },
        service_id: { type: ["string", "integer"] },
        starts_at: { type: "string", format: "date-time" },
        ends_at: { type: "string", format: "date-time" },
        customer: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: ["string", "null"] },
          },
          required: ["name", "email"],
        },
        status: {
          type: "string",
          enum: ["pending", "confirmed", "cancelled", "completed", "no_show"],
        },
      },
      required: ["id", "service_id", "starts_at", "ends_at", "status"],
    },
  },
} as const;

export function registerSchemaResources(server: McpServer): void {
  registerStaticJsonResource(
    server,
    "schema-blog-post",
    "schema://blog-post",
    "Blog post JSON schema",
    "JSON schema describing GET /v1/blog-posts response items. Read this when generating a /blog or /blog/[slug] page so field names line up.",
    BLOG_POST_SCHEMA,
  );

  registerStaticJsonResource(
    server,
    "schema-product",
    "schema://product",
    "Product JSON schema",
    "JSON schema describing GET /v1/products response items. Read this when generating product cards or a storefront.",
    PRODUCT_SCHEMA,
  );

  registerStaticJsonResource(
    server,
    "schema-booking",
    "schema://booking",
    "Booking JSON schema",
    "JSON schema describing bookable services, availability slots, and bookings.",
    BOOKING_SCHEMA,
  );
}

function registerStaticJsonResource(
  server: McpServer,
  id: string,
  uri: string,
  title: string,
  description: string,
  schema: unknown,
): void {
  const text = JSON.stringify(schema, null, 2);
  server.registerResource(
    id,
    uri,
    { title, description, mimeType: "application/schema+json" },
    async (u) => ({
      contents: [{ uri: u.href, mimeType: "application/schema+json", text }],
    }),
  );
}
