import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../../src/server.js";
import type { Config } from "../../src/config.js";

const DEFAULT_TEST_CONFIG: Config = {
  apiKey: "ndsk_test_aaaaaaaaaaaaaaaaaaaaaaaa",
  apiUrl: "http://api.test.local/v1",
  projectId: undefined,
  displayName: undefined,
  userAgent: "@neuraldraft/mcp/test",
};

export interface TestServerHandle {
  client: Client;
  cleanup: () => Promise<void>;
}

/**
 * Spin up a Neural Draft MCP server bound to an `InMemoryTransport`-paired
 * client. Lets tests call tools / read resources without spawning a child
 * process.
 */
export async function makeTestServer(
  configOverride: Partial<Config> = {},
): Promise<TestServerHandle> {
  const config: Config = { ...DEFAULT_TEST_CONFIG, ...configOverride };
  const server = createMcpServer({ config });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return {
    client,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}

export const TEST_API_BASE = DEFAULT_TEST_CONFIG.apiUrl;
