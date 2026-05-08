/**
 * Stdio entry point for the Neural Draft MCP server.
 *
 * IMPORTANT: in stdio mode, stdout is reserved for JSON-RPC frames. Anything
 * written to stdout outside the protocol corrupts the stream and the AI
 * client disconnects with a parse error. All diagnostics go to stderr.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createMcpServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = createMcpServer({ config });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Diagnostic — stderr only.
  process.stderr.write(
    `[neuraldraft-mcp] connected (api=${config.apiUrl}, key=${maskKey(config.apiKey)})\n`,
  );

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      process.stderr.write(`[neuraldraft-mcp] received ${sig}, shutting down…\n`);
      void server.close().finally(() => process.exit(0));
    });
  }
}

function maskKey(key: string): string {
  if (key.length <= 12) return "***";
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

main().catch((err) => {
  // Make sure errors reach stderr, never stdout.
  process.stderr.write(
    `[neuraldraft-mcp] fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  if (err instanceof Error && err.stack) {
    process.stderr.write(`${err.stack}\n`);
  }
  process.exit(1);
});
