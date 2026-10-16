import { createRequire } from "node:module";

/**
 * The package version, read from package.json at runtime so the server info
 * reported to MCP clients can never drift from the published version.
 *
 * Both `src/version.ts` (tsx / vitest) and the bundled `dist/index.js` sit one
 * directory below package.json, and npm always ships package.json.
 */
const require = createRequire(import.meta.url);

export const VERSION: string = (require("../package.json") as { version: string }).version;
