import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("reads NEURALDRAFT_API_KEY", () => {
    const cfg = loadConfig({
      NEURALDRAFT_API_KEY: "ndsk_live_abcdefghijklmnopqrstuvwx",
    } as NodeJS.ProcessEnv);
    expect(cfg.apiKey).toBe("ndsk_live_abcdefghijklmnopqrstuvwx");
    expect(cfg.apiUrl).toBe("https://api.neuraldraft.io/v1");
  });

  it("falls back to NEURAL_DRAFT_* aliases", () => {
    const cfg = loadConfig({
      NEURAL_DRAFT_API_KEY: "ndsk_test_aaaaaaaaaaaaaaaaaaaaaaaa",
      NEURAL_DRAFT_API_URL: "http://localhost:8080/v1",
    } as NodeJS.ProcessEnv);
    expect(cfg.apiKey).toBe("ndsk_test_aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(cfg.apiUrl).toBe("http://localhost:8080/v1");
  });

  it("rejects a missing key with a helpful error", () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(/NEURALDRAFT_API_KEY/);
  });

  it("rejects a malformed key", () => {
    expect(() =>
      loadConfig({ NEURALDRAFT_API_KEY: "not-a-real-key" } as NodeJS.ProcessEnv),
    ).toThrow(/Invalid Neural Draft API key/);
  });

  it("rejects a non-URL apiUrl", () => {
    expect(() =>
      loadConfig({
        NEURALDRAFT_API_KEY: "ndsk_test_aaaaaaaaaaaaaaaaaaaaaaaa",
        NEURALDRAFT_API_URL: "not a url",
      } as NodeJS.ProcessEnv),
    ).toThrow(/valid URL/);
  });

  it("supports test-mode keys", () => {
    const cfg = loadConfig({
      NEURALDRAFT_API_KEY: "ndsk_test_abcdefghijklmnopqrstuvwx",
    } as NodeJS.ProcessEnv);
    expect(cfg.apiKey.startsWith("ndsk_test_")).toBe(true);
  });
});
