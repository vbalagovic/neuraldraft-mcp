import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ServerContext } from "../server.js";
import { NeuralDraftClient } from "../client.js";
import { mapApiError } from "../errors.js";

/**
 * Agencies: one server, several client workspaces (NEURALDRAFT_API_KEYS="name=key,…").
 * Every other tool acts on the ACTIVE workspace; switch_workspace changes it for the
 * rest of the session. Each key only reaches its own workspace (the API scopes keys).
 */
export function registerWorkspaceTools(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "list_workspaces",
    {
      title: "List configured workspaces",
      description: [
        "Lists the Neural Draft workspaces this server can act on (one API key each, from NEURALDRAFT_API_KEYS) and which one is active.",
        "Agencies: one workspace per client. Every other tool acts on the active workspace; use switch_workspace to change it.",
        "Before changing anything for a client, make sure the active workspace is that client's.",
      ].join(" "),
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (): Promise<CallToolResult> => {
      const names = Object.keys(ctx.config.workspaces ?? {});
      if (names.length === 0) {
        return text(
          `This server is set up for one workspace (NEURALDRAFT_API_KEY). To work across several client workspaces, set NEURALDRAFT_API_KEYS="client-a=ndsk_live_…,client-b=ndsk_live_…" (one API key per workspace, from each workspace's admin → API keys).`,
        );
      }
      const rows = await Promise.all(
        names.map(async (name) => {
          const key = ctx.config.workspaces[name] ?? "";
          let brand = "";
          try {
            const c = new NeuralDraftClient({ ...ctx.config, apiKey: key });
            const b = (await c.getBrand()) as unknown as { name?: string; company_name?: string };
            brand = b?.name || b?.company_name || "";
          } catch {
            brand = "(key not accepted)";
          }
          const active = name === ctx.config.activeWorkspace ? " ← active" : "";
          return `- ${name}${brand ? ` — ${brand}` : ""}${active}`;
        }),
      );
      return text(`${names.length} workspace(s):\n${rows.join("\n")}`);
    },
  );

  server.registerTool(
    "switch_workspace",
    {
      title: "Switch the active workspace",
      description:
        "Makes another configured workspace (a client) the active one; every following tool call acts on it until you switch again. Names come from list_workspaces.",
      inputSchema: {
        workspace: z.string().min(1).describe("Workspace name from list_workspaces."),
      },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ workspace }): Promise<CallToolResult> => {
      const names = Object.keys(ctx.config.workspaces ?? {});
      const match =
        names.find((n) => n === workspace) ??
        names.find((n) => n.toLowerCase() === workspace.toLowerCase());
      if (!match) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: names.length
                ? `No workspace named "${workspace}". Configured: ${names.join(", ")}.`
                : "Only one workspace is configured (NEURALDRAFT_API_KEY). Set NEURALDRAFT_API_KEYS to use several.",
            },
          ],
        };
      }
      const key = ctx.config.workspaces[match] ?? "";
      try {
        const next = new NeuralDraftClient({ ...ctx.config, apiKey: key });
        await next.getBrand(); // the key works before we switch
        ctx.config = { ...ctx.config, apiKey: key, activeWorkspace: match };
        ctx.client = next;
      } catch (err) {
        return mapApiError(err);
      }
      return text(`Active workspace: ${match}. Every tool now acts on this workspace.`);
    },
  );
}

function text(t: string): CallToolResult {
  return { content: [{ type: "text", text: t }] };
}
