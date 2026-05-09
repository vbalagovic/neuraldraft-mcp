/**
 * Shared types used across the MCP server.
 *
 * These mirror the relevant Neural Draft Project API v1 schemas as documented
 * in the OpenAPI spec. They are intentionally narrower than the full SDK types
 * — only the fields the MCP layer actually consumes.
 */

export interface BrandColor {
  hex: string;
  name?: string | null;
}

export interface BrandFonts {
  heading?: string | null;
  body?: string | null;
}

export interface BrandContext {
  voice?: string | null;
  audience?: string | null;
  content_tone?: string | null;
  content_goals?: string[] | null;
  preferred_topics?: string[] | null;
  description?: string | null;
  logo_url?: string | null;
  colors?: {
    primary?: BrandColor | null;
    secondary?: BrandColor | null;
    accent?: BrandColor | null;
  } | null;
  fonts?: BrandFonts | null;
  industry?: string | null;
  /**
   * If true (free-tier projects), every generated UI MUST include the
   * `branding_badge_html` snippet in its footer. Paid tiers receive false.
   */
  requires_branding_badge?: boolean;
  /** Pre-rendered badge HTML — drop verbatim into the page footer. */
  branding_badge_html?: string | null;
}

export interface RegisteredComponent {
  id: string;
  intent?: string;
  page_slug?: string | null;
  html: string;
  keys_created: string[];
  image_keys?: string[];
  editor_url?: string;
  created_at: string;
  updated_at: string;
}

export interface JobReference {
  id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress?: number;
  result?: unknown;
  error?: { code: string; message: string } | null;
  created_at: string;
  updated_at?: string;
}

export interface Product {
  id: string | number;
  name: string;
  slug?: string;
  description?: string | null;
  price_cents?: number;
  currency?: string;
  status?: "draft" | "active" | "archived";
  inventory?: number | null;
  images?: Array<{ url: string; alt?: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface Paginated<T> {
  data: T[];
  meta?: { page: number; page_size: number; total: number };
}

export interface NewsletterSubscription {
  id: number;
  email: string;
  app_lead?: boolean;
  subscribed_at?: string | null;
}

export interface ContactFormSubmission {
  id: number;
  email: string;
  subject?: string | null;
  message?: string | null;
  data?: Record<string, unknown> | null;
  submitted_at?: string | null;
}

export interface BookingWidgetEmbed {
  embed_html: string;
  snippet_url: string;
  service_id: string | number;
}

export interface TranslationKeyCreateResult {
  created: string[];
  skipped_existing: string[];
}

export interface Page {
  id: number;
  slug: string;
  title: string;
  type: "landing" | "blog_list" | "blog_post" | "legal";
  is_homepage: boolean;
  is_active: boolean;
  exclude_from_search?: boolean;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PageInput {
  slug: string;
  title: string;
  type?: "landing" | "blog_list" | "blog_post" | "legal";
  is_homepage?: boolean;
  is_active?: boolean;
  exclude_from_search?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  canonical_url?: string | null;
}

export type PageUpdateInput = Partial<PageInput>;

// -------------------- Blog posts --------------------

export type BlogPostStatus = "draft" | "published" | "scheduled" | "archived";

export interface BlogPostTranslation {
  lang: string;
  title: string;
  excerpt?: string | null;
  content?: string;
  meta_title?: string | null;
  meta_description?: string | null;
}

export interface BlogPost {
  id: number;
  slug: string;
  status: BlogPostStatus;
  featured_image?: string | null;
  published_at?: string | null;
  scheduled_at?: string | null;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  translations?: BlogPostTranslation[];
  created_at?: string;
  updated_at?: string;
}

export interface BlogPostUpdateInput {
  title?: string;
  content?: string;
  excerpt?: string;
  meta_title?: string | null;
  meta_description?: string | null;
  slug?: string;
  category_id?: number;
  featured_image?: string;
  status?: "draft" | "published" | "scheduled";
  language_code?: string;
  tags?: number[];
}

// -------------------- Brand update --------------------

export interface BrandUpdateInput {
  voice?: string | null;
  audience?: string | null;
  content_tone?: string | null;
  content_goals?: string[] | null;
  preferred_topics?: string[] | null;
  description?: string | null;
  logo_url?: string | null;
  colors?: {
    primary?: { hex?: string | null; name?: string | null } | null;
    secondary?: { hex?: string | null; name?: string | null } | null;
    accent?: { hex?: string | null; name?: string | null } | null;
  } | null;
  fonts?: { heading?: string | null; body?: string | null } | null;
  target_languages?: string[] | null;
  default_language?: string | null;
}

// -------------------- Content (translation keys) --------------------

export interface ContentKey {
  key: string;
  scope?: string;
  scope_id?: number | null;
  value?: string | null;
  all_locales?: Record<string, string>;
  updated_at?: string | null;
}

// -------------------- Usage --------------------

export interface UsageBreakdownEntry {
  operation_type: string;
  total_spent: number;
  count: number;
}

export interface Usage {
  credits_balance: number;
  credits_monthly_limit: number;
  credits_reset_at: string | null;
  period_start: string;
  period_end: string;
  total_spent_this_period: number;
  breakdown: UsageBreakdownEntry[];
}

// -------------------- Workspaces (central login) --------------------

export interface Workspace {
  id: number;
  name: string;
  domain: string;
}
