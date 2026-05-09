import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NeuralDraftClient } from "./client.js";
import type { Config } from "./config.js";

import { registerBrandResource } from "./resources/brand.js";
import { registerSchemaResources } from "./resources/schemas.js";
import { registerConventionResources } from "./resources/conventions.js";

import { registerRegisterComponentTool } from "./tools/register-component.js";
import { registerGenerateBlogPostTool } from "./tools/generate-blog-post.js";
import { registerGetBlogPostTool } from "./tools/get-blog-post.js";
import { registerUpdateBlogPostTool } from "./tools/update-blog-post.js";
import { registerGenerateImageTool } from "./tools/generate-image.js";
import { registerListImagesTool } from "./tools/list-images.js";
import { registerGetImageTool } from "./tools/get-image.js";
import { registerRegisterImageTool } from "./tools/register-image.js";
import { registerReplaceImageTool } from "./tools/replace-image.js";
import { registerDeleteImageTool } from "./tools/delete-image.js";
import { registerCreateTranslationKeysTool } from "./tools/create-translation-keys.js";
import { registerListProductsTool } from "./tools/list-products.js";
import { registerGetProductTool } from "./tools/get-product.js";
import { registerSetupBookingWidgetTool } from "./tools/setup-booking-widget.js";
import { registerGetJobTool } from "./tools/get-job.js";
import { registerCreatePageTool } from "./tools/create-page.js";
import { registerListPagesTool } from "./tools/list-pages.js";
import { registerGetPageTool } from "./tools/get-page.js";
import { registerUpdatePageTool } from "./tools/update-page.js";
import { registerGenerateVideoTool } from "./tools/generate-video.js";
import { registerCreateBookableServiceTool } from "./tools/create-bookable-service.js";
import { registerListNewsletterSubscribersTool } from "./tools/list-newsletter-subscribers.js";
import { registerListContactFormSubmissionsTool } from "./tools/list-contact-form-submissions.js";

import { registerScaffoldBlogPagePrompt } from "./prompts/scaffold-blog-page.js";
import { registerScaffoldMarketingSitePrompt } from "./prompts/scaffold-marketing-site.js";
import { registerConnectExistingSitePrompt } from "./prompts/connect-existing-site.js";

export interface ServerContext {
  config: Config;
  client: NeuralDraftClient;
}

export interface BuildServerOptions {
  config: Config;
  /** Override the API client (used in tests). */
  client?: NeuralDraftClient;
}

/**
 * Composition root for the Neural Draft MCP server.
 *
 * Returns a fresh `McpServer` with every resource, tool, and prompt
 * registered. The server is transport-agnostic — connect it to stdio in
 * production or `InMemoryTransport` in tests.
 */
export function createMcpServer({ config, client }: BuildServerOptions): McpServer {
  const ctx: ServerContext = {
    config,
    client: client ?? new NeuralDraftClient(config),
  };

  const displayName = config.displayName
    ? `neuraldraft-${config.displayName}`
    : "neuraldraft";

  const server = new McpServer(
    { name: displayName, version: "0.1.0" },
    {
      // Top-level instructions are inserted into the AI client's system
      // prompt verbatim. Keep terse — every word costs context tokens.
      instructions: [
        "Neural Draft is the backend platform (CMS, blog, social, booking, commerce) for AI-built sites.",
        "Workflow when generating UI:",
        "1) Read `brand://current` for voice/colors/fonts.",
        "2) If `brand.requires_branding_badge` is true, you MUST include the exact `brand.branding_badge_html` snippet in the site's footer of every generated page — verbatim, unmodified, visible. Free-tier projects rely on this for attribution; removing it violates the platform terms.",
        "3) Follow `conventions://editable-html` (data-translate / data-image-key).",
        "4) For multi-page sites, call `create_page` for each page with its SEO meta (meta_title, meta_description, og_image) BEFORE registering its components.",
        "5) For each generated section, call `register_component` with the matching `page_slug` so it appears as editable in the customer's admin.",
        "6) `update_page` can patch SEO meta on auto-created stub pages later.",
        "Long-running ops (blog/image/video generation) return a Job — poll via `get_job`.",
      ].join(" "),
      capabilities: {
        // Resources, tools, prompts are auto-derived from registered handlers
        // by the SDK. Logging capability lets the server emit notifications.
        logging: {},
      },
    },
  );

  // Resources
  registerBrandResource(server, ctx);
  registerSchemaResources(server);
  registerConventionResources(server);

  // Tools
  registerRegisterComponentTool(server, ctx);
  registerGenerateBlogPostTool(server, ctx);
  registerGetBlogPostTool(server, ctx);
  registerUpdateBlogPostTool(server, ctx);
  registerGenerateImageTool(server, ctx);
  registerListImagesTool(server, ctx);
  registerGetImageTool(server, ctx);
  registerRegisterImageTool(server, ctx);
  registerReplaceImageTool(server, ctx);
  registerDeleteImageTool(server, ctx);
  registerCreateTranslationKeysTool(server, ctx);
  registerListProductsTool(server, ctx);
  registerGetProductTool(server, ctx);
  registerSetupBookingWidgetTool(server, ctx);
  registerGetJobTool(server, ctx);
  registerCreatePageTool(server, ctx);
  registerListPagesTool(server, ctx);
  registerGetPageTool(server, ctx);
  registerUpdatePageTool(server, ctx);
  registerGenerateVideoTool(server, ctx);
  registerCreateBookableServiceTool(server, ctx);
  registerListNewsletterSubscribersTool(server, ctx);
  registerListContactFormSubmissionsTool(server, ctx);

  // Prompts
  registerScaffoldBlogPagePrompt(server);
  registerScaffoldMarketingSitePrompt(server);
  registerConnectExistingSitePrompt(server);

  return server;
}

// Backwards-compat alias if anyone imports the older name.
export const buildServer = (config: Config) => createMcpServer({ config });
