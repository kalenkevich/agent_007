import path from 'path';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*_test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*_test.ts'],
        },
      },
      {
        test: {
          name: 'e2e',
          environment: 'node',
          include: ['tests/e2e/**/*_test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
    },
    alias: {
      '@agent007/core': path.resolve(__dirname, './src/core'),
      '@agent007/ui': path.resolve(__dirname, './src/ui'),
      '@agent007/common': path.resolve(__dirname, './src/common'),
      '@agent007/cli': path.resolve(__dirname, './src/cli'),
    },
  },
});
