import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*_test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*_test.ts"],
        },
      },
      {
        test: {
          name: "e2e",
          environment: "node",
          include: ["tests/e2e/**/*_test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json"],
    },
  },
});
