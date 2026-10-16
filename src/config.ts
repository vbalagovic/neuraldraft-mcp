import { z } from "zod";
import { VERSION } from "./version.js";

/**
 * The API key format mirrors Stripe-style live/test prefixes:
 *
 *   ndsk_live_xxxxxxxxxxxxxxxxxxxxxxxx (production)
 *   ndsk_test_xxxxxxxxxxxxxxxxxxxxxxxx (test mode)
 *
 * The platform mints these — we only validate the *shape* here so a
 * mistyped key fails at boot rather than on first API call.
 */
const API_KEY_REGEX = /^ndsk_(live|test)_[A-Za-z0-9_-]{16,}$/;

const ConfigSchema = z.object({
  apiKey: z
    .string({ required_error: "Missing NEURALDRAFT_API_KEY environment variable." })
    .regex(API_KEY_REGEX, {
      message:
        "Invalid Neural Draft API key. Expected format: ndsk_live_… or ndsk_test_… " +
        "(get one at https://neuraldraft.io/dashboard/api-keys).",
    }),
  apiUrl: z
    .string()
    .url("NEURALDRAFT_API_URL must be a valid URL (e.g. https://api.neuraldraft.io/v1).")
    .default("https://api.neuraldraft.io/v1"),
  projectId: z.string().optional(),
  displayName: z.string().optional(),
  /**
   * Several workspaces in one server (agencies with many client workspaces):
   * name → API key, from NEURALDRAFT_API_KEYS. The active one is `apiKey`;
   * switch with the switch_workspace tool.
   */
  workspaces: z.record(z.string().regex(API_KEY_REGEX, { message: "Invalid key in NEURALDRAFT_API_KEYS (expected ndsk_live_… / ndsk_test_…)." })).default({}),
  activeWorkspace: z.string().optional(),
  userAgent: z.string().default(`@neuraldraft/mcp/${VERSION}`),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Resolve config from environment variables.
 *
 * Primary names: NEURALDRAFT_*  (matches the user's IDE config snippets).
 * Aliases:       NEURAL_DRAFT_* (matches the scaffold-plan documentation).
 * Whichever is set first wins.
 *
 * Throws a friendly error if the key is missing or malformed — the message
 * is the first thing a new user sees if they paste the IDE config wrong.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const pick = (...names: string[]): string | undefined => {
    for (const name of names) {
      const v = env[name];
      if (v !== undefined && v !== "") return v;
    }
    return undefined;
  };

  const workspaces = parseWorkspaces(pick("NEURALDRAFT_API_KEYS", "NEURAL_DRAFT_API_KEYS"));
  const names = Object.keys(workspaces);
  const wanted = pick("NEURALDRAFT_WORKSPACE", "NEURAL_DRAFT_WORKSPACE");
  const single = pick("NEURALDRAFT_API_KEY", "NEURAL_DRAFT_API_KEY");
  const activeWorkspace = wanted && workspaces[wanted] ? wanted : !single && names.length ? names[0] : undefined;

  const candidate = {
    workspaces,
    activeWorkspace,
    apiKey: activeWorkspace ? workspaces[activeWorkspace] : single,
    apiUrl: pick("NEURALDRAFT_API_URL", "NEURAL_DRAFT_API_URL"),
    projectId: pick("NEURALDRAFT_PROJECT_ID", "NEURAL_DRAFT_PROJECT_ID"),
    displayName: pick("NEURALDRAFT_DISPLAY_NAME", "NEURAL_DRAFT_DISPLAY_NAME"),
  };

  const parsed = ConfigSchema.safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      [
        "Invalid Neural Draft MCP configuration.",
        "",
        issues,
        "",
        "Set NEURALDRAFT_API_KEY in your MCP client config (Claude Code, Cursor, Continue, etc.),",
        "or NEURALDRAFT_API_KEYS=\"client-a=ndsk_live_…,client-b=ndsk_live_…\" for several workspaces.",
        "Example for Claude Code (~/.config/claude-code/mcp.json):",
        "",
        '  {',
        '    "mcpServers": {',
        '      "neuraldraft": {',
        '        "command": "npx",',
        '        "args": ["-y", "@neuraldraft/mcp"],',
        '        "env": { "NEURALDRAFT_API_KEY": "ndsk_live_..." }',
        "      }",
        "    }",
        "  }",
      ].join("\n"),
    );
  }
  return parsed.data;
}

/**
 * NEURALDRAFT_API_KEYS: `name=key,name2=key2` (or a JSON object {"name": "key"}).
 * Names are free text you choose (e.g. the client's name); keys are per-workspace.
 */
export function parseWorkspaces(raw: string | undefined): Record<string, string> {
  if (!raw || raw.trim() === "") return {};
  const text = raw.trim();
  if (text.startsWith("{")) {
    try {
      const obj = JSON.parse(text) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([, v]) => typeof v === "string")
          .map(([k, v]) => [k.trim(), String(v).trim()]),
      );
    } catch {
      throw new Error("NEURALDRAFT_API_KEYS is not valid JSON.");
    }
  }
  const out: Record<string, string> = {};
  for (const part of text.split(/[,\n]/)) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    const name = part.slice(0, i).trim();
    const key = part.slice(i + 1).trim();
    if (name && key) out[name] = key;
  }
  return out;
}
