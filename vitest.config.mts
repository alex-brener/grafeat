import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Default 10s hookTimeout is occasionally too tight for createTestDb()'s
    // PGlite (in-memory WASM Postgres) cold start when several test files'
    // beforeEach hooks boot one in parallel — observed as flaky timeouts on
    // the *first* PGlite instantiation in a file, never a real assertion
    // failure. 30s gives real contention room without masking a genuine hang.
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
