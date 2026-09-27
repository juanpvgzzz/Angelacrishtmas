import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  vite: {
    cacheDir: process.env.CATALOG_E2E === '1' ? 'node_modules/.vite-catalog-e2e' : 'node_modules/.vite',
  },
});
