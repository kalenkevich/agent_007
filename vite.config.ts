import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join } from 'path';

export default defineConfig({
  plugins: [react()],
  root: join(__dirname, 'src/ui'),
  base: './',
  build: {
    outDir: join(__dirname, 'dist/ui'),
    emptyOutDir: false, // Don't empty since main.js/preload.js are there
  },
});
