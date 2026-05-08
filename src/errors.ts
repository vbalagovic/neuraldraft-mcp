import { ApiError } from "./client.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Map a thrown error from the API client into an MCP CallToolResult.
 *
 * IMPORTANT: in MCP, *protocol* errors (thrown) abort the request — the
 * model loses the chance to recover. *Domain* errors (`isError: true`) are
 * surfaced to the model so it can apologise, retry, or pivot.
 *
 * We treat every API-side issue as a domain error.
 */
export function mapApiError(err: unknown): CallToolResult {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return errorResult(
        "Neural Draft API rejected the API key. " +
          "Check NEURALDRAFT_API_KEY in your MCP client config — " +
          "it should be a key copied from https://neuraldraft.io/dashboard/api-keys.",
      );
    }
    if (err.status === 402) {
      return errorResult(
        "This Neural Draft project is out of credits. " +
          "Top up or upgrade the plan at https://neuraldraft.io/billing, then retry.",
      );
    }
    if (err.status === 403) {
      return errorResult(
        `The API key is missing the scope required for this operation (${err.path}). ` +
          "Visit the dashboard to issue a new key with the right scopes.",
      );
    }
    if (err.status === 404) {
      return errorResult(`Resource not found: ${err.path}.`);
    }
    if (err.status === 422) {
      return errorResult(
        `Neural Draft rejected the input as invalid (${err.path}). ` +
          `Details: ${truncate(err.body)}`,
      );
    }
    if (err.status === 429) {
      return errorResult(
        "Rate limited by Neural Draft (60 req/min default). Retry in a few seconds.",
      );
    }
    if (err.status >= 500) {
      return errorResult(
        `Neural Draft API is currently unavailable (${err.status}). ` +
          "Try again in a moment; if it persists check https://status.neuraldraft.io.",
      );
    }
    return errorResult(`Neural Draft API error (${err.status}): ${truncate(err.body)}`);
  }
  return errorResult(
    `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
  );
}

export function errorResult(text: string): CallToolResult {
  return {
    content: [{ type: "text", text }],
    isError: true,
  };
}

function truncate(s: string, max = 400): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}
