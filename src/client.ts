import type { Config } from "./config.js";
import type {
  BlogPost,
  BlogPostUpdateInput,
  BookingWidgetEmbed,
  BrandContext,
  BrandUpdateInput,
  ContactFormSubmission,
  ContentKey,
  Gallery,
  GalleryCreateInput,
  GalleryUpdateInput,
  JobReference,
  NewsletterSubscription,
  Page,
  PageInput,
  PageUpdateInput,
  Paginated,
  Product,
  RegisteredComponent,
  TranslationKeyCreateResult,
  Usage,
  Workspace,
} from "./types.js";

/**
 * Thin wrapper around the Neural Draft Project API.
 *
 * Uses the Node 20+ built-in `fetch`. When `@neuraldraft/sdk` (auto-generated
 * from openapi.yaml) is published, the bodies of these methods can be swapped
 * to delegate to it without changing call sites in the MCP layer.
 */
export class NeuralDraftClient {
  constructor(
    private readonly cfg: Config,
    private readonly fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {}

  // -------------------- Brand --------------------

  getBrand(): Promise<BrandContext> {
    return this.request<BrandContext>("GET", "/brand");
  }

  updateBrand(input: BrandUpdateInput): Promise<BrandContext> {
    return this.request<BrandContext>("PATCH", "/brand", input);
  }

  // -------------------- Components --------------------

  registerComponent(input: {
    html: string;
    intent: string;
    page_slug?: string;
    position?: number;
  }): Promise<RegisteredComponent> {
    return this.request<RegisteredComponent>("POST", "/components/register", input);
  }

  /**
   * DELETE /v1/components/{id} — remove a registered component.
   * Returns 204 on success, 404 if the component doesn't exist.
   */
  deleteComponent(id: number): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/components/${encodeURIComponent(String(id))}`,
    );
  }

  // -------------------- Content / Translations --------------------

  /**
   * Bulk-create translation keys with default values. Used by the
   * `create_translation_keys` tool.
   *
   * Note: the v1 spec does not yet have a single "bulk create" endpoint; we
   * iterate over `PUT /content/{key}` per key. The result schema below is
   * synthesised by the client. Once the spec gains a bulk endpoint, swap
   * the body in-place — the tool contract stays stable.
   */
  /**
   * GET /v1/content/{key}?lang=en — read a single translation key.
   * Returns the resolved value plus the full all_locales map.
   */
  getContent(key: string, opts: { lang?: string } = {}): Promise<ContentKey> {
    const qs = toQuery({ lang: opts.lang });
    return this.request<ContentKey>(
      "GET",
      `/content/${encodeURIComponent(key)}${qs}`,
    );
  }

  /**
   * GET /v1/content — paginated list. Filter by `search` (substring on key)
   * and `scope` (page|component|global).
   *
   * The API doesn't support a literal `prefix` filter; we pass `search` so
   * the same intent works (controller does `LIKE %search%`).
   */
  listContent(
    params: {
      search?: string;
      scope?: "page" | "component" | "global";
      lang?: string;
      page?: number;
      page_size?: number;
    } = {},
  ): Promise<Paginated<ContentKey>> {
    const qs = toQuery(params);
    return this.request<Paginated<ContentKey>>("GET", `/content${qs}`);
  }

  /**
   * DELETE /v1/content/{key} — remove a translation key (all locales).
   * Returns 204 on success, 404 if the key doesn't exist.
   */
  deleteContent(key: string): Promise<void> {
    return this.request<void>("DELETE", `/content/${encodeURIComponent(key)}`);
  }

  async createTranslationKeys(
    keys: Record<string, string>,
    language: string = "en",
  ): Promise<TranslationKeyCreateResult> {
    const created: string[] = [];
    const skipped_existing: string[] = [];
    for (const [key, value] of Object.entries(keys)) {
      try {
        // ContentController::upsert validates `lang` (not `language_code`).
        // `create_if_missing` is not part of the validate ruleset — the
        // upsert is always create-or-update — so we drop it.
        await this.request<unknown>(
          "PUT",
          `/content/${encodeURIComponent(key)}`,
          { value, lang: language },
        );
        created.push(key);
      } catch (err) {
        // 409 means already exists — surface it as "skipped" without failing the batch.
        if (err instanceof ApiError && err.status === 409) {
          skipped_existing.push(key);
          continue;
        }
        throw err;
      }
    }
    return { created, skipped_existing };
  }

  // -------------------- Blog --------------------

  /**
   * Trigger an AI blog-post generation. Returns a Job reference; poll
   * `GET /jobs/{id}` (or use the `get_job` tool) for completion.
   *
   * The v1 API expects `type: 'ai'` plus all AI parameters at the top level
   * (see BlogController::storeAi). It accepts `translate_to_all: true` (auto-
   * translate into every project target language); single-language translation
   * is done post-publish via POST /v1/blog-posts/{id}/translations.
   */
  generateBlogPost(input: {
    topic: string;
    style?: "professional" | "casual" | "educational" | "thought_leadership" | "storytelling";
    word_count?: number;
    target_audience?: string;
    primary_keyword?: string;
    secondary_keywords?: string[];
    translate_to_all?: boolean;
    enable_research?: boolean;
    research_depth?: "light" | "standard" | "deep";
    image_style?: "photo" | "illustration" | "abstract";
    additional_instructions?: string;
  }): Promise<JobReference> {
    return this.request<JobReference>("POST", "/blog-posts", {
      type: "ai",
      ...input,
    });
  }

  /**
   * POST /v1/blog-posts/{id}/translations — async translate to one language.
   * Returns 202 + JobReference.
   */
  translateBlogPost(id: number, languageCode: string): Promise<JobReference> {
    return this.request<JobReference>(
      "POST",
      `/blog-posts/${encodeURIComponent(String(id))}/translations`,
      { language_code: languageCode },
    );
  }

  /**
   * GET /blog-posts/{id_or_slug} — fetch a single post.  Numeric ids and
   * slugs are both accepted by the API.  When `lang` is supplied, the
   * server-side resource picks the matching translation for `title`,
   * `content`, `excerpt`, `meta_title`, `meta_description`.
   */
  getBlogPost(idOrSlug: string | number, opts: { lang?: string } = {}): Promise<BlogPost> {
    const qs = toQuery({ lang: opts.lang });
    return this.request<BlogPost>(
      "GET",
      `/blog-posts/${encodeURIComponent(String(idOrSlug))}${qs}`,
    );
  }

  /**
   * GET /blog-posts — paginated list (filter by status, language, category, tag).
   */
  listBlogPosts(
    params: {
      page?: number;
      page_size?: number;
      status?: "draft" | "published" | "scheduled";
      lang?: string;
      category?: string;
      tag?: string;
      sort?: "created_at" | "published_at" | "-created_at" | "-published_at";
    } = {},
  ): Promise<Paginated<BlogPost>> {
    const qs = toQuery(params);
    return this.request<Paginated<BlogPost>>("GET", `/blog-posts${qs}`);
  }

  /**
   * PATCH /blog-posts/{id} — update fields on an existing post.  Text
   * fields (title, content, excerpt, meta_title, meta_description) write
   * to the matching PostTranslation (resolved by `language_code`, default
   * 'en').  Post-level fields (slug, category_id, featured_image, status,
   * tags) write to the post itself.
   */
  updateBlogPost(id: number, input: BlogPostUpdateInput): Promise<BlogPost> {
    return this.request<BlogPost>(
      "PATCH",
      `/blog-posts/${encodeURIComponent(String(id))}`,
      input,
    );
  }

  // -------------------- Images --------------------

  generateImage(input: {
    prompt: string;
    aspect_ratio?: string;
    style?: string;
    key?: string;
  }): Promise<JobReference> {
    return this.request<JobReference>("POST", "/images", input);
  }

  /**
   * List registered image keys. `prefix` filters by user-key prefix
   * (e.g. `hero.` → `hero.background`, `hero.foreground`).
   */
  listImages(
    params: { page?: number; page_size?: number; prefix?: string } = {},
  ): Promise<Paginated<{ key: string; url: string | null; created_at: string | null; updated_at: string | null }>> {
    const qs = toQuery(params);
    return this.request<
      Paginated<{ key: string; url: string | null; created_at: string | null; updated_at: string | null }>
    >("GET", `/images${qs}`);
  }

  getImage(
    key: string,
  ): Promise<{ key: string; url: string | null; created_at: string | null; updated_at: string | null }> {
    return this.request<{
      key: string;
      url: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>("GET", `/images/${encodeURIComponent(key)}`);
  }

  /**
   * Register or swap an image's URL via direct URL. Synchronous, 0 credits.
   */
  registerImage(
    key: string,
    url: string,
  ): Promise<{ key: string; url: string | null; created_at: string | null; updated_at: string | null }> {
    return this.request<{
      key: string;
      url: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>("PUT", `/images/${encodeURIComponent(key)}`, { url });
  }

  /**
   * Regenerate the image at `key` via AI. Returns a Job (poll get_job).
   * Costs ~40 credits.
   */
  regenerateImage(
    key: string,
    input: { prompt: string; aspect_ratio?: string; style?: string },
  ): Promise<JobReference> {
    return this.request<JobReference>("PUT", `/images/${encodeURIComponent(key)}`, {
      regenerate: true,
      ...input,
    });
  }

  deleteImage(key: string): Promise<void> {
    return this.request<void>("DELETE", `/images/${encodeURIComponent(key)}`);
  }

  // -------------------- Videos --------------------

  /**
   * Trigger an AI video clip. `tier` selects the model & cost:
   *   - "budget"  (default) → Wan 2.1, 40 credits, every plan
   *   - "premium" → Kling v2.1 / Runway Gen4, 300 credits, Build plan or higher
   * Returns a Job; poll `getJob`.
   */
  generateVideo(input: {
    prompt: string;
    tier?: "budget" | "premium";
    aspect_ratio?: string;
    duration_seconds?: number;
    visual_style?: string;
    platforms?: string[];
  }): Promise<JobReference> {
    return this.request<JobReference>("POST", "/videos", input);
  }

  // -------------------- Bookable services --------------------

  createBookableService(input: {
    name: string;
    slug?: string;
    description?: string;
    short_description?: string;
    price?: number;
    currency?: string;
    booking_type?: "time_slot" | "date_range";
    duration_minutes?: number;
    buffer_before_minutes?: number;
    buffer_after_minutes?: number;
    max_bookings_per_slot?: number;
    min_notice_hours?: number;
    max_advance_days?: number;
    cancellation_hours?: number;
    min_nights?: number;
    max_nights?: number;
    color?: string;
  }): Promise<{ id: number; name: string; slug: string; booking_type: string }> {
    return this.request<{ id: number; name: string; slug: string; booking_type: string }>(
      "POST",
      "/bookable-services",
      input,
    );
  }

  // -------------------- Forms (newsletter + contact) --------------------

  listNewsletterSubscribers(
    params: { page?: number; page_size?: number; app_lead?: boolean; search?: string } = {},
  ): Promise<Paginated<NewsletterSubscription>> {
    const qs = toQuery(params);
    return this.request<Paginated<NewsletterSubscription>>("GET", `/newsletters${qs}`);
  }

  listContactFormSubmissions(
    params: { page?: number; page_size?: number; search?: string } = {},
  ): Promise<Paginated<ContactFormSubmission>> {
    const qs = toQuery(params);
    return this.request<Paginated<ContactFormSubmission>>("GET", `/contact-forms${qs}`);
  }

  // -------------------- Pages --------------------

  listPages(
    params: { page?: number; page_size?: number; type?: string; is_active?: boolean } = {},
  ): Promise<Paginated<Page>> {
    const qs = toQuery(params);
    return this.request<Paginated<Page>>("GET", `/pages${qs}`);
  }

  getPage(idOrSlug: string | number): Promise<Page> {
    return this.request<Page>("GET", `/pages/${encodeURIComponent(String(idOrSlug))}`);
  }

  createPage(input: PageInput): Promise<Page> {
    return this.request<Page>("POST", "/pages", input);
  }

  updatePage(id: number, input: PageUpdateInput): Promise<Page> {
    return this.request<Page>("PATCH", `/pages/${encodeURIComponent(String(id))}`, input);
  }

  /**
   * DELETE /v1/pages/{id} — by default soft-retires the page (sets is_active=false).
   * Pass `force=true` for a hard delete. Refuses to delete the homepage.
   */
  deletePage(id: number, force: boolean = false): Promise<void> {
    const qs = force ? "?force=1" : "";
    return this.request<void>(
      "DELETE",
      `/pages/${encodeURIComponent(String(id))}${qs}`,
    );
  }

  // -------------------- Galleries --------------------

  /**
   * GET /v1/galleries — paginated list of galleries (ordered by name).
   * Note: the v1 endpoint uses `per_page` (not `page_size`) for items-per-page.
   */
  listGalleries(
    params: { page?: number; per_page?: number } = {},
  ): Promise<Paginated<Gallery>> {
    const qs = toQuery(params);
    return this.request<Paginated<Gallery>>("GET", `/galleries${qs}`);
  }

  /** GET /v1/galleries/{slug} */
  getGallery(slug: string): Promise<Gallery> {
    return this.request<Gallery>(
      "GET",
      `/galleries/${encodeURIComponent(slug)}`,
    );
  }

  /**
   * POST /v1/galleries — create. Slug auto-derived from name when omitted;
   * collisions get -2, -3, ... suffixed automatically.
   */
  createGallery(input: GalleryCreateInput): Promise<Gallery> {
    return this.request<Gallery>("POST", "/galleries", input);
  }

  /** PATCH /v1/galleries/{slug} — update name and/or items (slug is immutable). */
  updateGallery(slug: string, input: GalleryUpdateInput): Promise<Gallery> {
    return this.request<Gallery>(
      "PATCH",
      `/galleries/${encodeURIComponent(slug)}`,
      input,
    );
  }

  /** DELETE /v1/galleries/{slug} — hard delete. Returns 204. */
  deleteGallery(slug: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/galleries/${encodeURIComponent(slug)}`,
    );
  }

  // -------------------- Products --------------------

  listProducts(params: { page?: number; page_size?: number; status?: string } = {}): Promise<
    Paginated<Product>
  > {
    const qs = toQuery(params);
    return this.request<Paginated<Product>>("GET", `/products${qs}`);
  }

  getProduct(id: string | number): Promise<Product> {
    return this.request<Product>("GET", `/products/${encodeURIComponent(String(id))}`);
  }

  // -------------------- Booking --------------------

  /**
   * Resolve the embed snippet for a bookable service.
   *
   * The widget endpoint returns JS, but the MCP tool only needs the URL +
   * a paste-ready `<script>` tag — we synthesise both here.
   */
  async getBookingWidget(serviceId: string | number): Promise<BookingWidgetEmbed> {
    // Confirm the service exists first so the AI gets a clean 404 if not.
    await this.request<unknown>(
      "GET",
      `/bookable-services/${encodeURIComponent(String(serviceId))}`,
    );
    const snippet_url = `${this.cfg.apiUrl}/widgets/booking/${encodeURIComponent(
      String(serviceId),
    )}.js`;
    const embed_html = `<script src="${snippet_url}" async data-neuraldraft-booking="${serviceId}"></script>`;
    return { embed_html, snippet_url, service_id: serviceId };
  }

  // -------------------- Jobs --------------------

  getJob(id: string): Promise<JobReference> {
    return this.request<JobReference>("GET", `/jobs/${encodeURIComponent(id)}`);
  }

  // -------------------- Project / usage --------------------

  /**
   * GET /v1/projects/me/usage — current credit balance, period bounds, and
   * per-operation spend breakdown.
   */
  getUsage(): Promise<Usage> {
    return this.request<Usage>("GET", "/projects/me/usage");
  }

  // -------------------- Workspaces (central login) --------------------

  /**
   * GET <central>/central/api/tenants-for-email?email=...
   *
   * The endpoint is on the CENTRAL host (e.g. https://app.neuraldraft.io),
   * not the per-tenant API. Returns the list of {id, name, domain} workspaces
   * the email is registered against — handy when an AI is troubleshooting
   * multi-workspace login. Always 200 (empty list for unknown emails).
   *
   * Derives the central host from the API URL:
   *   https://api.neuraldraft.io/v1            → https://app.neuraldraft.io
   *   http://app.lvh.me/v1                     → http://app.lvh.me
   *   http://acme.lvh.me/v1                    → http://app.lvh.me (sibling host)
   * The override `centralUrl` lets callers point this at any host explicitly.
   */
  async findWorkspaces(
    email: string,
    centralUrl?: string,
  ): Promise<{ workspaces: Workspace[] }> {
    const base = centralUrl ?? deriveCentralHost(this.cfg.apiUrl);
    const url = `${base.replace(/\/$/, "")}/central/api/tenants-for-email?email=${encodeURIComponent(email)}`;

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": this.cfg.userAgent,
        },
      });
    } catch (err) {
      throw new ApiError(0, err instanceof Error ? err.message : String(err), url);
    }

    if (!res.ok) {
      const text = await safeText(res);
      throw new ApiError(res.status, text || res.statusText, url);
    }

    const json = (await res.json()) as { tenants?: Workspace[] };
    return { workspaces: Array.isArray(json?.tenants) ? json.tenants : [] };
  }

  // -------------------- Internals --------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<T> {
    const url = `${this.cfg.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.cfg.apiKey}`,
      Accept: "application/json",
      "User-Agent": this.cfg.userAgent,
      ...extraHeaders,
    };
    let payload: string | undefined;
    if (body !== undefined) {
      payload = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, { method, headers, body: payload });
    } catch (err) {
      throw new ApiError(0, err instanceof Error ? err.message : String(err), path);
    }

    if (!res.ok) {
      const text = await safeText(res);
      throw new ApiError(res.status, text || res.statusText, path);
    }

    if (res.status === 204) return undefined as T;

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as unknown;
      // Laravel V1 JsonResource responses are wrapped in {data: ...} — unwrap.
      // Image controller is the one outlier wrapping in {job: ...}.
      // Anything without those wrappers (paginated lists with their own data+meta,
      // bulk content reads, RFC 7807 errors, etc.) is returned as-is.
      return unwrapResource(json) as T;
    }
    return (await res.text()) as unknown as T;
  }
}

/**
 * Unwrap a Laravel JsonResource-style response.
 *
 * - `{data: X, meta: ...}`  → return as-is (paginated list)
 * - `{data: X}` (single)    → return X
 * - `{job: X}`              → return X (image controller)
 * - anything else           → return as-is
 */
function unwrapResource(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const obj = value as Record<string, unknown>;
  // Paginated list: keep both data + meta.
  if ("data" in obj && "meta" in obj) return obj;
  // Single resource wrapped under `data`.
  if ("data" in obj && Object.keys(obj).length === 1) return obj.data;
  // Image controller's `{job: ...}` wrapper.
  if ("job" in obj && Object.keys(obj).length === 1) return obj.job;
  return obj;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/**
 * Best-effort derivation of the central admin host from the API base URL.
 * Heuristics:
 *   - api.<root> → app.<root>     (production)
 *   - <tenant>.<root>:port → app.<root>:port  (subdomain dev)
 *   - http://localhost:port/v1 → http://localhost:port  (single-host dev)
 *   - already an `app.` host → returned as-is
 */
function deriveCentralHost(apiUrl: string): string {
  let u: URL;
  try {
    u = new URL(apiUrl);
  } catch {
    return apiUrl.replace(/\/v1\/?$/, "");
  }
  const host = u.host;
  // host[:port]
  const [hostname, port] = host.split(":");
  if (!hostname) return `${u.protocol}//${host}`;

  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return `${u.protocol}//${host}`;
  }

  const parts = hostname.split(".");
  // already app.* → keep
  if (parts[0] === "app") {
    return `${u.protocol}//${host}`;
  }
  // strip the first label, prepend `app`
  if (parts.length >= 2) {
    const root = parts.slice(1).join(".");
    const rebuilt = port ? `app.${root}:${port}` : `app.${root}`;
    return `${u.protocol}//${rebuilt}`;
  }
  return `${u.protocol}//${host}`;
}

function toQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of entries) sp.set(k, String(v));
  return `?${sp.toString()}`;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;
  readonly path: string;

  constructor(status: number, body: string, path: string) {
    super(`Neural Draft API ${status} on ${path}: ${body.slice(0, 500)}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.path = path;
  }
}
