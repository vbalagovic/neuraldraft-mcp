import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node20",
  shims: false,
  // index.ts must be executable as `node dist/index.js`. The shebang lets
  // MCP clients spawn it with `command: "node"` or `command: "npx"` interchangeably.
  banner: { js: "#!/usr/bin/env node" },
});
