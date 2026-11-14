import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The build inlines all JS and CSS into dist/index.html so the site stays one shareable file.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  server: {
    port: 8765,
    proxy: { '/api': { target: 'http://127.0.0.1:8787' } },
  },
  // The sunhacks badge is about 20 KB; inline it so dist/index.html stays one file.
  build: { target: 'es2020', assetsInlineLimit: 100_000 },
});
