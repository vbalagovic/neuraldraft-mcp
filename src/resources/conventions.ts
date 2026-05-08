import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const EDITABLE_HTML = `# Neural Draft editable-HTML conventions

Every section you generate MUST follow these rules so the customer's admin can
edit it without touching code.

## Text nodes

Wrap every human-visible text node with \`data-translate="<key>"\`:

\`\`\`html
<h1 data-translate="hero.headline">Welcome</h1>
<p data-translate="hero.subhead">Your subhead here</p>
<a href="#book" data-translate="hero.cta">Book now</a>
\`\`\`

Key rules:

- Use dot.namespaced keys: \`<section>.<field>\`
- One key per atomic text node — don't bundle a heading and a paragraph under one key
- Lowercase, no spaces. \`hero.subhead\` not \`Hero.SubHead\`
- For repeated items use array indices: \`pricing.tiers.0.title\`, \`pricing.tiers.1.title\`

## Images

\`\`\`html
<img data-image-key="hero.background" src="/placeholder.svg" alt="">
\`\`\`

The customer can swap the image in the admin; the resolved CDN URL replaces
\`src\` automatically when the page is hydrated.

## Calling Neural Draft at runtime

### Read content (build-time, recommended for SSG)

\`\`\`ts
const res = await fetch(
  \`https://api.neuraldraft.io/v1/content/bulk?keys=\${keys.join(",")}&lang=\${lang}\`,
  { headers: { Authorization: \`Bearer \${process.env.NEURALDRAFT_API_KEY}\` } },
);
const { values } = await res.json();
// values is { "hero.headline": "Welcome", ... }
\`\`\`

### Read content (client-side, for editable overlay)

Drop the \`@neuraldraft/edit\` snippet (when published). Until then, hydrate
each \`[data-translate]\` node by calling \`/v1/content/bulk\` with the keys you
collected from the DOM.

### Resolve images

\`\`\`ts
const res = await fetch(\`https://api.neuraldraft.io/v1/images/\${key}\`, {
  headers: { Authorization: \`Bearer \${KEY}\` },
});
const { url } = await res.json();
\`\`\`

## Registering what you generated

After you emit a section, call the \`register_component\` tool with the
generated HTML and an \`intent\` (e.g. \`marketing_hero\`, \`pricing_grid\`).
Neural Draft parses the markup, creates the translation keys for every
\`data-translate\` attribute it finds, and exposes the section as editable in
the project admin.

## Localisation

If the site is multi-language, the same content keys are read with a
different \`lang\` query parameter. Don't hardcode language strings in the
markup — \`data-translate\` is the only path that gives the customer a
translatable site.
`;

const API_USAGE = `# Neural Draft API conventions

## Auth

Every request needs a Bearer token from the project's API key:

\`\`\`
Authorization: Bearer ndsk_live_xxxxxxxxxxxxxxxxxxxxxxxx
\`\`\`

Get one at https://neuraldraft.io/dashboard/api-keys.

Test mode keys (\`ndsk_test_…\`) hit the same endpoints but charge no real
credits and route to staging integrations (test Stripe, sandbox social).

## Base URL

\`\`\`
https://api.neuraldraft.io/v1
\`\`\`

Override with \`NEURALDRAFT_API_URL\` (mostly useful in CI / staging).

## Errors (RFC 7807)

\`\`\`json
{
  "type": "https://neuraldraft.io/errors/out-of-credits",
  "title": "Out of credits",
  "status": 402,
  "code": "out_of_credits",
  "detail": "Project has 0 credits. Top up to continue."
}
\`\`\`

Always check \`code\` (stable machine identifier) — never parse \`detail\`.

## Rate limits

Default: 60 req/min, burst 120, per project key. Every response carries:

| Header | Meaning |
|---|---|
| \`X-RateLimit-Limit\` | Window ceiling |
| \`X-RateLimit-Remaining\` | Requests left in window |
| \`X-RateLimit-Reset\` | Unix seconds when bucket refills |
| \`Retry-After\` | Seconds to wait — present only on 429 |

## Idempotency

Mutating endpoints accept \`Idempotency-Key: <unique-string>\`. Retries with
the same key within 24 h return the original response without re-running
the side effect. Use UUIDs.

## Async work

Long-running ops (blog generation, image generation, batch translation,
website generation) return a Job:

\`\`\`json
{ "id": "job_abc", "type": "blog_post.generate", "status": "pending", "progress": 0 }
\`\`\`

Two ways to track:

- Poll \`GET /jobs/{id}\` until \`status\` is \`completed\` / \`failed\` / \`cancelled\`
- Stream \`GET /jobs/{id}/stream\` (Server-Sent Events) for live progress

Use the MCP \`get_job\` tool from inside an AI session.

## Webhooks

Subscribe a URL via \`POST /webhook-endpoints\`. Deliveries are signed:

\`\`\`
X-Neural-Draft-Signature: t=<unix>,v1=<hex_hmac_sha256(body, secret)>
X-Neural-Draft-Event: order.paid
X-Neural-Draft-Delivery: <uuid>
\`\`\`

Verify the timestamp is within 5 min and the HMAC matches before trusting
the payload.

## Retries (recommended)

- Network errors / 502 / 503 / 504 → exponential backoff up to 3 retries
- 429 → respect \`Retry-After\`
- 4xx (other) → don't retry; the input is the problem
`;

export function registerConventionResources(server: McpServer): void {
  registerStaticMarkdownResource(
    server,
    "conventions-editable-html",
    "conventions://editable-html",
    "Editable-HTML conventions",
    "How to mark up generated HTML so it is editable in the Neural Draft admin (data-translate, data-image-key, runtime fetches).",
    EDITABLE_HTML,
  );

  registerStaticMarkdownResource(
    server,
    "conventions-api-usage",
    "conventions://api-usage",
    "API usage conventions",
    "Auth headers, error shape, rate limits, idempotency, retries, and async/job patterns for the Neural Draft Project API.",
    API_USAGE,
  );
}

function registerStaticMarkdownResource(
  server: McpServer,
  id: string,
  uri: string,
  title: string,
  description: string,
  text: string,
): void {
  server.registerResource(id, uri, { title, description, mimeType: "text/markdown" }, async (u) => ({
    contents: [{ uri: u.href, mimeType: "text/markdown", text }],
  }));
}
