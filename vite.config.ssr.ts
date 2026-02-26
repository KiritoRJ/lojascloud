import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist/server',
    ssr: true,
    rollupOptions: {
      input: 'server.ts',
      output: {
        entryFileNames: 'index.mjs',
        format: 'esm',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
