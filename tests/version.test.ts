import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { VERSION } from "../src/version.js";

describe("version", () => {
  it("matches package.json and server.json", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const srv = JSON.parse(readFileSync(new URL("../server.json", import.meta.url), "utf8"));
    expect(VERSION).toBe(pkg.version);
    expect(srv.version).toBe(pkg.version);
    expect(srv.packages[0].version).toBe(pkg.version);
  });
});
