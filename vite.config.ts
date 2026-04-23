import react from '@vitejs/plugin-react';
import {join, resolve} from 'path';
import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: join(__dirname, 'src/ui'),
  base: './',
  resolve: {
    alias: {
      '@/components': resolve(__dirname, './src/ui/components'),
      '@': resolve(__dirname, './src'),
      '@agent007/core': resolve(__dirname, './src/core/index.ts'),
      '@agent007/core/node': resolve(__dirname, './src/core/node.ts'),
      '@agent007/common': resolve(__dirname, './src/common/index.ts'),
    },
  },
  build: {
    outDir: join(__dirname, 'dist/ui'),
    emptyOutDir: false, // Don't empty since main.js/preload.js are there
  },
});