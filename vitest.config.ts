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
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
            '@agent007/core': path.resolve(__dirname, './src/core/index.ts'),
            '@agent007/core/node': path.resolve(
              __dirname,
              './src/core/node.ts',
            ),
            '@agent007/common': path.resolve(
              __dirname,
              './src/common/index.ts',
            ),
          },
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*_test.ts'],
        },
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
            '@agent007/core': path.resolve(__dirname, './src/core/index.ts'),
            '@agent007/core/node': path.resolve(
              __dirname,
              './src/core/node.ts',
            ),
            '@agent007/common': path.resolve(
              __dirname,
              './src/common/index.ts',
            ),
          },
        },
      },
      {
        test: {
          name: 'e2e',
          environment: 'node',
          include: ['tests/e2e/**/*_test.ts'],
        },
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
            '@agent007/core': path.resolve(__dirname, './src/core/index.ts'),
            '@agent007/core/node': path.resolve(
              __dirname,
              './src/core/node.ts',
            ),
            '@agent007/common': path.resolve(
              __dirname,
              './src/common/index.ts',
            ),
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
    },
  },
});
